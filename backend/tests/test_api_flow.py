"""End-to-end flows through the real API (CONTRACTS §5)."""
import pytest

from tests.conftest import SAMPLES, give_consent, login, needs_real_ingest, upload

API = "/api/v1"
RAVI = "9000000001"
WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]


def _fresh_ravi(client) -> dict:
    h = login(client, RAVI)
    assert client.post(f"{API}/demo/reset", headers=h).json() == {"ok": True}
    return h


def _accept_first(client, h) -> dict:
    offers = client.get(f"{API}/offers?requested_paise=1000000", headers=h).json()
    ok = [o for o in offers["loans"] if o["eligible"] in ("ELIGIBLE", "NEEDS_REVIEW") and o["fits_safe_instalment"]]
    assert ok, offers
    o = ok[0]
    r = client.post(f"{API}/offers/{o['id']}/accept", headers=h,
                    json={"amount_paise": o["amount_paise"], "weeks": o["weeks"]})
    assert r.status_code == 200, r.text
    return r.json()


def _check_schedule(client, h, loan):
    from datetime import date
    afford = client.get(f"{API}/affordability", headers=h).json()
    assert len(loan["schedule"]) == loan["weeks"]
    assert loan["payout_weekday"] == afford["payout_weekday"]
    for row in loan["schedule"]:
        assert WEEKDAYS[date.fromisoformat(row["due_date"]).weekday()] == loan["payout_weekday"]


@needs_real_ingest
def test_flow_csv(client):
    h = _fresh_ravi(client)
    cid = give_consent(client, h)
    r = upload(client, h, cid)
    assert r.status_code == 200, r.text
    assert client.get(f"{API}/scores/latest", headers=h).json()["band"]
    _check_schedule(client, h, _accept_first(client, h))


@pytest.mark.skipif(not (SAMPLES / "ravi.locked.pdf").is_file(), reason="sample PDFs not on main yet")
def test_flow_locked_pdf(client):
    h = _fresh_ravi(client)
    cid = give_consent(client, h)
    data = (SAMPLES / "ravi.locked.pdf").read_bytes()
    r = upload(client, h, cid, data=data, filename="ravi.locked.pdf")
    assert r.json()["error"]["code"] == "PDF_PASSWORD_REQUIRED"
    r = upload(client, h, cid, data=data, filename="ravi.locked.pdf", password="WRONG000")
    assert r.json()["error"]["code"] == "PDF_PASSWORD_WRONG"
    r = upload(client, h, cid, data=data, filename="ravi.locked.pdf", password="RAVI0101")
    assert r.status_code == 200, r.text
    assert r.json()["kind"] == "PDF"
    _check_schedule(client, h, _accept_first(client, h))


@needs_real_ingest
def test_full_flow(client):
    h = _fresh_ravi(client)
    cid = give_consent(client, h)
    assert upload(client, h, cid).status_code == 200

    # Recategorise one transaction.
    weeks = client.get(f"{API}/transactions", headers=h).json()["weeks"]
    txn = weeks[0]["txns"][0]
    r = client.patch(f"{API}/transactions/{txn['id']}", headers=h, json={"category": "FOOD"})
    assert r.status_code == 200 and r.json()["txn"]["user_corrected"] is True
    assert client.patch(f"{API}/transactions/{txn['id']}", headers=h,
                        json={"category": "NOPE"}).json()["error"]["code"] == "BAD_CATEGORY"

    # Score, what-if, stress.
    assert client.post(f"{API}/scores", headers=h).status_code == 200
    assert client.post(f"{API}/scores/what-if", headers=h, json={"tip_code": "SAVE_EVERY_WEEK"}).status_code == 200
    assert client.post(f"{API}/scores/what-if", headers=h,
                       json={"tip_code": "X"}).json()["error"]["code"] == "BAD_TIP"
    r = client.post(f"{API}/affordability/stress", headers=h, json={"shock": 0.2, "weekly_instalment_paise": 20000})
    assert r.status_code == 200 and r.json()["light"] in ("GREEN", "AMBER", "RED")
    assert client.post(f"{API}/affordability/stress", headers=h,
                       json={"shock": 0.5, "weekly_instalment_paise": 1}).status_code == 422

    # Accept → advance the clock → reminder → pay.
    loan = _accept_first(client, h)
    first = loan["schedule"][0]
    assert client.get(f"{API}/reminders", headers=h).json() == []
    days_to_t2 = (__import__("datetime").date.fromisoformat(first["due_date"])
                  - __import__("datetime").date.fromisoformat(loan["start_date"])).days - 1
    client.post(f"{API}/demo/advance-clock", headers=h, json={"days": days_to_t2})
    rem = client.get(f"{API}/reminders", headers=h).json()
    assert [x["code"] for x in rem] == ["REMINDER_T_MINUS_2"]
    assert set(rem[0]["params"]) == {"amount_paise", "due_date", "lender"}
    r = client.post(f"{API}/repayments/{first['id']}/pay", headers=h)
    assert r.status_code == 200 and r.json()["status"] == "PAID"
    assert client.post(f"{API}/repayments/{first['id']}/pay", headers=h).status_code == 422
    assert client.get(f"{API}/loans", headers=h).json()[0]["schedule"][0]["status"] == "PAID"

    # Share with MFI Alpha.
    lenders = client.get(f"{API}/lenders", headers=h).json()
    alpha = next(l for l in lenders if l["name"] == "MFI Alpha")
    s1 = client.post(f"{API}/shares", headers=h, json={"lender_id": alpha["id"]}).json()
    s2 = client.post(f"{API}/shares", headers=h, json={"lender_id": alpha["id"]}).json()
    assert s1["id"] == s2["id"]  # idempotent

    # Wellness + goal.
    w = client.get(f"{API}/wellness/weekly?weeks=4", headers=h).json()
    assert "weeks" in w and "nudges" in w
    g = client.post(f"{API}/goals", headers=h, json={"name": "New phone", "target_paise": 800000}).json()
    assert g["weekly_target_paise"] >= 2000 and g["weekly_target_paise"] % 1000 == 0
    assert g["weeks_left"] >= 1 and client.get(f"{API}/goals", headers=h).json()[0]["id"] == g["id"]

    # Revoke → data gone, score kept but marked, share ended.
    r = client.post(f"{API}/consents/{cid}/revoke", headers=h).json()
    assert r["consent"]["status"] == "REVOKED" and r["deleted"]["transactions"] > 0
    assert client.get(f"{API}/transactions", headers=h).json() == {"weeks": []}
    assert client.get(f"{API}/scores/latest", headers=h).json()["consent_revoked"] is True
    assert client.get(f"{API}/shares", headers=h).json() == []

    actions = {a["action"] for a in client.get(f"{API}/audit", headers=h).json()}
    assert {"CONSENT_CREATED", "STATEMENT_UPLOADED", "TXN_RECATEGORISED", "LOAN_ACCEPTED", "REPAYMENT_PAID",
            "SHARED_WITH_LENDER", "CONSENT_REVOKED"} <= actions


def test_demo_reset_clears_everything(client):
    h = _fresh_ravi(client)
    cid = give_consent(client, h)
    upload(client, h, cid)
    client.post(f"{API}/demo/reset", headers=h)
    me = client.get(f"{API}/me", headers=h).json()
    assert not me["has_active_consent"] and not me["has_score"] and not me["has_loan"]
