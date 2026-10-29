"""Real-data checks on data/samples (CONTRACTS §7 persona ranges + the demo-script numbers in HANDOFF.md)."""
from datetime import date

import pytest

from app.db import SessionLocal
from app.models import User
from app.security.hashing import phone_hash
from app.seed import seed_persona_data
from tests.conftest import SAMPLES, give_consent, login, upload

API = "/api/v1"
RAVI = "9000000001"

pytestmark = pytest.mark.skipif(not (SAMPLES / "ravi.aa.json").is_file(), reason="data/samples not generated")


def _fresh(client, phone=RAVI) -> dict:
    h = login(client, phone)
    client.post(f"{API}/demo/reset", headers=h)
    return h


def test_ravi_demo_numbers(client):
    h = _fresh(client)
    cid = give_consent(client, h)
    r = upload(client, h, cid, data=(SAMPLES / "ravi.csv").read_bytes(), filename="ravi.csv")
    assert r.status_code == 200, r.text
    s = r.json()["score"]
    assert 72 <= s["score"] <= 88 and s["band"] in ("STRONG", "GOOD") and s["confidence"] == "HIGH"
    assert r.json()["txn_count"] == 284

    afford = client.get(f"{API}/affordability", headers=h).json()
    assert 25_000 <= afford["safe_weekly_paise"] <= 40_000 and afford["payout_weekday"] == "FRI"

    offers = client.get(f"{API}/offers?requested_paise=1000000", headers=h).json()
    assert offers["safe_amount_paise"] == 720_000
    from app import finance
    assert offers["rbi_cap_amount_paise"] == finance.loan_max(afford["rbi_cap_weekly_paise"], 24, 26)
    assert offers["rbi_cap_amount_paise"] > offers["safe_amount_paise"]

    # Stress: shock 0 is the baseline of the risk graph; whatever Rajat returns (e.g. `series`) passes through.
    base = client.post(f"{API}/affordability/stress", headers=h, json={"shock": 0, "weekly_instalment_paise": 29451})
    assert base.status_code == 200, base.text
    from app import scoring
    from app.services.txn_store import load_txns
    with SessionLocal() as db:
        user = db.query(User).filter(User.phone_hash == phone_hash(RAVI)).one()
        expected = scoring.stress_test(load_txns(db, user.id), 0.0, 29451)
    assert set(base.json()) == set(expected)
    assert base.json()["weeks_covered"] >= client.post(
        f"{API}/affordability/stress", headers=h, json={"shock": 0.3, "weekly_instalment_paise": 29451}
    ).json()["weeks_covered"]
    by_name = {o["lender"]["name"]: o for o in offers["loans"]}
    assert by_name["MFI Beta"]["eligible"] == "ELIGIBLE" and by_name["MFI Alpha"]["eligible"] == "ELIGIBLE"
    assert by_name["MFI Gamma"]["eligible"] == "OUTSIDE" and by_name["MFI Gamma"]["reason"] == "BELOW_MIN_AMOUNT"
    assert by_name["MFI Alpha"]["kfs"]["apr_pct"] == 32.0

    alpha = by_name["MFI Alpha"]
    loan = client.post(f"{API}/offers/{alpha['id']}/accept", headers=h,
                       json={"amount_paise": alpha["amount_paise"], "weeks": 26}).json()
    assert len(loan["schedule"]) == 26
    assert all(date.fromisoformat(x["due_date"]).weekday() == 4 for x in loan["schedule"])  # Fridays
    assert sum(x["amount_paise"] for x in loan["schedule"]) == loan["kfs"]["total_repayable_paise"]

    r = client.post(f"{API}/consents/{cid}/revoke", headers=h).json()
    assert r["deleted"] == {"transactions": 284, "sources": 1}


def test_aa_fetch_matches_csv_score(client):
    h = _fresh(client)
    cid = give_consent(client, h)
    csv_score = upload(client, h, cid, data=(SAMPLES / "ravi.csv").read_bytes(), filename="ravi.csv").json()
    client.post(f"{API}/demo/reset", headers=h)
    cid = give_consent(client, h)
    r = client.post(f"{API}/aa/fetch", headers=h, json={"consent_id": cid, "persona": "ravi"})
    assert r.status_code == 200, r.text
    aa = r.json()
    assert aa["kind"] == "AA" and aa["stages"][0]["ms"] >= 600  # simulated bank latency in DEMO_MODE
    assert aa["score"]["score"] == csv_score["score"]["score"]


def test_revoked_consent_blocks_aa_fetch(client):
    h = login(client)
    cid = give_consent(client, h)
    client.post(f"{API}/consents/{cid}/revoke", headers=h)
    r = client.post(f"{API}/aa/fetch", headers=h, json={"consent_id": cid, "persona": "ravi"})
    assert r.json()["error"]["code"] == "CONSENT_REVOKED"


def test_wrong_and_missing_pdf_password(client):
    h = _fresh(client)
    cid = give_consent(client, h)
    data = (SAMPLES / "ravi.locked.pdf").read_bytes()
    assert upload(client, h, cid, data=data, filename="ravi.locked.pdf").json()["error"]["code"] == \
        "PDF_PASSWORD_REQUIRED"
    assert upload(client, h, cid, data=data, filename="ravi.locked.pdf",
                  password="NOPE0101").json()["error"]["code"] == "PDF_PASSWORD_WRONG"


def test_seeded_personas_and_lender_dashboard(client):
    with SessionLocal() as db:
        seed_persona_data(db)
        seed_persona_data(db)  # idempotent
    scores = {}
    for phone, slug in (("9000000002", "sunita"), ("9000000003", "arjun"), ("9000000004", "meena")):
        h = login(client, phone)
        scores[slug] = client.get(f"{API}/scores/latest", headers=h).json()
        assert len(client.get(f"{API}/lenders", headers=h).json()) == 3
    assert scores["sunita"]["score"] >= 85 and scores["sunita"]["band"] == "STRONG"
    assert 35 <= scores["arjun"]["score"] <= 55 and scores["arjun"]["band"] == "FAIR"
    assert scores["meena"]["confidence"] == "LOW" and scores["meena"]["provisional"] is True
    assert scores["sunita"]["score"] > scores["arjun"]["score"]

    lh = login(client, "9999999991")
    apps = client.get(f"{API}/lender/applicants", headers=lh).json()
    assert len(apps) >= 3
    r = client.put(f"{API}/lender/rules", headers=lh,
                   json={"min_band": "STRONG", "max_amount_paise": 1_000_000, "min_weeks": 12}).json()
    assert r["eligible_after"] <= r["eligible_before"]
    client.put(f"{API}/lender/rules", headers=lh, json={"min_band": "FAIR", "max_amount_paise": 1_000_000,
                                                         "min_weeks": 8})
    with SessionLocal() as db:
        assert db.query(User).filter(User.phone_hash == phone_hash("9000000002")).count() == 1


def test_fairness_report(client):
    r = client.get(f"{API}/fairness/report")
    assert r.status_code == 200
    body = r.json()
    assert body["tests"] and all(t["passed"] for t in body["tests"])
    assert len(body["personas"]) == 4


def test_demo_samples_download(client):
    r = client.get(f"{API}/demo/samples/ravi.csv")
    assert r.status_code == 200 and r.content.startswith(b"date,narration")
    assert client.get(f"{API}/demo/samples/ravi.pdf").content[:5] == b"%PDF-"
