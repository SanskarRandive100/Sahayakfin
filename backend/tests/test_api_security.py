"""Security tests: expiry, IDOR, lender key check, JWT tampering, no secrets in logs, error shape."""
import logging
from datetime import timedelta

import jwt as pyjwt

from app.config import settings
from app.db import SessionLocal
from app.models import Consent
from app.services import clock
from tests.conftest import give_consent, login, needs_real_ingest, onboard, upload

API = "/api/v1"
FORBIDDEN_LENDER_KEYS = {"narration", "narration_masked", "phone", "phone_masked", "payee_token", "balance",
                         "balance_paise", "display_name", "user_id"}


def _all_keys(obj) -> set:
    if isinstance(obj, dict):
        return set(obj) | set().union(*(_all_keys(v) for v in obj.values())) if obj else set()
    if isinstance(obj, list):
        return set().union(*(_all_keys(v) for v in obj)) if obj else set()
    return set()


def test_expired_consent_deletes_data(client):
    h, cid = onboard(client)
    with SessionLocal() as db:
        c = db.get(Consent, cid)
        c.expires_at = clock.now() - timedelta(minutes=1)
        db.commit()
    assert client.get(f"{API}/transactions", headers=h).json() == {"weeks": []}
    consents = client.get(f"{API}/consents", headers=h).json()
    assert consents[0]["status"] == "EXPIRED"
    assert "CONSENT_EXPIRED" in {a["action"] for a in client.get(f"{API}/audit", headers=h).json()}


def test_advance_clock_past_data_life_expires(client):
    h = login(client)
    cid = give_consent(client, h, data_life_days=3)
    upload(client, h, cid)
    client.post(f"{API}/demo/advance-clock", headers=h, json={"days": 4})
    assert client.get(f"{API}/me", headers=h).json()["has_active_consent"] is False


def test_revoke_returns_counts_and_audits(client):
    h, cid = onboard(client)
    r = client.post(f"{API}/consents/{cid}/revoke", headers=h).json()
    assert r["deleted"]["sources"] == 1 and r["deleted"]["transactions"] > 0
    assert client.get(f"{API}/transactions", headers=h).json()["weeks"] == []
    actions = [a["action"] for a in client.get(f"{API}/audit", headers=h).json()]
    assert {"CONSENT_CREATED", "STATEMENT_UPLOADED", "CONSENT_REVOKED"} <= set(actions)


@needs_real_ingest
def test_idor_returns_404(client):
    a, a_cid = onboard(client)
    b = login(client)
    txn = client.get(f"{API}/transactions", headers=a).json()["weeks"][0]["txns"][0]
    assert client.patch(f"{API}/transactions/{txn['id']}", headers=b, json={"category": "FOOD"}).status_code == 404
    assert client.post(f"{API}/consents/{a_cid}/revoke", headers=b).status_code == 404
    # B uploading into A's consent is refused without confirming it exists.
    assert upload(client, b, a_cid).json()["error"]["code"] == "CONSENT_REQUIRED"
    offers = client.get(f"{API}/offers", headers=a).json()["loans"]
    ok = [o for o in offers if o["eligible"] != "OUTSIDE" and o["fits_safe_instalment"]]
    assert client.post(f"{API}/offers/{offers[0]['id']}/accept", headers=b,
                       json={"amount_paise": 500000, "weeks": 26}).status_code == 404
    loan = client.post(f"{API}/offers/{ok[0]['id']}/accept", headers=a,
                       json={"amount_paise": ok[0]["amount_paise"], "weeks": ok[0]["weeks"]}).json()
    assert client.post(f"{API}/repayments/{loan['schedule'][0]['id']}/pay", headers=b).status_code == 404
    assert client.get(f"{API}/loans", headers=b).json() == []
    assert client.get(f"{API}/consents", headers=b).json() == []
    lender_id = client.get(f"{API}/lenders", headers=a).json()[0]["id"]
    share = client.post(f"{API}/shares", headers=a, json={"lender_id": lender_id}).json()
    assert client.delete(f"{API}/shares/{share['id']}", headers=b).status_code == 404


def test_jwt_tampering_rejected(client):
    h = login(client)
    token = h["Authorization"].split()[1]
    claims = pyjwt.decode(token, options={"verify_signature": False})
    claims["role"] = "LENDER"
    forged = pyjwt.encode(claims, "not-the-secret", algorithm="HS256")
    assert client.get(f"{API}/me", headers={"Authorization": f"Bearer {forged}"}).status_code == 401
    # Even correctly signed, a role claim that disagrees with the DB is refused.
    resigned = pyjwt.encode(claims, settings.jwt_secret, algorithm="HS256")
    assert client.get(f"{API}/lender/applicants",
                      headers={"Authorization": f"Bearer {resigned}"}).status_code == 401
    unsigned = pyjwt.encode(claims, None, algorithm="none") if hasattr(pyjwt, "encode") else ""
    assert client.get(f"{API}/me", headers={"Authorization": f"Bearer {unsigned}"}).status_code == 401


def test_password_never_logged(client, caplog):
    h = login(client)
    cid = give_consent(client, h)
    secret = "SECRET-PW-7731"
    pdf = b"%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF"
    with caplog.at_level(logging.DEBUG):
        upload(client, h, cid, data=pdf, filename="x.pdf", password=secret)
        upload(client, h, cid, password=secret)
    assert secret not in caplog.text


def test_lender_sees_only_summary_keys(client):
    h, _ = onboard(client)
    alpha = next(l for l in client.get(f"{API}/lenders", headers=h).json() if l["name"] == "MFI Alpha")
    client.post(f"{API}/shares", headers=h, json={"lender_id": alpha["id"]})
    lh = login(client, "9999999991")
    apps = client.get(f"{API}/lender/applicants", headers=lh).json()
    assert apps and all(a["applicant_ref"].startswith("APP-") for a in apps)
    assert not (_all_keys(apps) & FORBIDDEN_LENDER_KEYS)
    # Each view is audited on the user's side, with the lender's name.
    audit = client.get(f"{API}/audit", headers=h).json()
    assert any(a["action"] == "VIEW_SCORE_SUMMARY" and a["actor_name"] == "MFI Alpha" for a in audit)


def test_lender_rules_change_counts(client):
    lh = login(client, "9999999992")  # MFI Beta
    r = client.put(f"{API}/lender/rules", headers=lh, json={"min_band": "BUILDING", "max_amount_paise": 2500000,
                                                            "min_weeks": 1})
    assert r.status_code == 200
    body = r.json()
    assert body["rules"]["min_band"] == "BUILDING" and body["eligible_after"] >= body["eligible_before"] - 0
    client.put(f"{API}/lender/rules", headers=lh, json={"min_band": "GOOD", "max_amount_paise": 2500000,
                                                        "min_weeks": 10})


def test_error_shape_everywhere(client):
    h = login(client)
    cases = [
        client.get(f"{API}/me"),                                                       # 401
        client.get(f"{API}/lender/applicants", headers=h),                             # 403
        client.get(f"{API}/no-such-route"),                                            # 404
        client.post(f"{API}/consents", headers=h, json={"range_days": "x"}),           # 422
        client.post(f"{API}/auth/otp/verify", json={"phone": "9000000009", "otp": "1"}),  # 422
        client.post(f"{API}/aa/fetch", headers=h, json={"consent_id": "x", "persona": "ravi"}),  # 400
    ]
    for r in cases:
        assert r.status_code >= 400
        err = r.json()["error"]
        assert err["code"].isupper() and isinstance(err["message"], str)


def test_unknown_persona(client):
    h = login(client)
    cid = give_consent(client, h)
    r = client.post(f"{API}/aa/fetch", headers=h, json={"consent_id": cid, "persona": "mallory"})
    assert r.json()["error"]["code"] == "UNKNOWN_PERSONA"


def test_demo_samples_reject_traversal(client):
    assert client.get(f"{API}/demo/samples/..%2F..%2F.env").status_code == 404
    assert client.get(f"{API}/demo/samples/mallory.csv").status_code == 404
