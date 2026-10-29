import os

from tests.conftest import give_consent, login, upload

API = "/api/v1"


def test_upload_csv_gives_score(client):
    h = login(client)
    cid = give_consent(client, h)
    r = upload(client, h, cid)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["kind"] == "CSV" and body["txn_count"] > 0
    assert [s["code"] for s in body["stages"]] == ["READ", "MASK", "CATEGORISE", "SCORE"]
    assert "score" in body["score"] and "id" in body["score"]
    me = client.get(f"{API}/me", headers=h).json()
    assert me["has_active_consent"] and me["has_score"]
    latest = client.get(f"{API}/scores/latest", headers=h)
    assert latest.status_code == 200 and latest.json()["id"] == body["score"]["id"]


def test_random_bytes_unsupported(client):
    h = login(client)
    cid = give_consent(client, h)
    r = upload(client, h, cid, data=os.urandom(2048), filename="x.bin")
    assert r.status_code == 400 and r.json()["error"]["code"] == "UNSUPPORTED_FILE"


def test_pdf_with_javascript_rejected(client):
    h = login(client)
    cid = give_consent(client, h)
    pdf = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /OpenAction << /S /JavaScript /JS (app.alert(1)) >> >>\nendobj\n%%EOF"
    r = upload(client, h, cid, data=pdf, filename="statement.pdf")
    assert r.status_code == 400 and r.json()["error"]["code"] == "PDF_HAS_SCRIPT"


def test_fake_pdf_extension_rejected(client):
    h = login(client)
    cid = give_consent(client, h)
    r = upload(client, h, cid, data=b"date,narration,debit,credit,balance\n", filename="statement.pdf")
    assert r.json()["error"]["code"] == "UNSUPPORTED_FILE"


def test_too_large(client):
    h = login(client)
    cid = give_consent(client, h)
    r = upload(client, h, cid, data=b"a,b\n" * (1024 * 1024 + 10), filename="big.csv")
    assert r.status_code == 413 and r.json()["error"]["code"] == "FILE_TOO_LARGE"


def test_too_many_pages(client):
    h = login(client)
    cid = give_consent(client, h)
    pdf = b"%PDF-1.4\n" + b"".join(b"%d 0 obj << /Type /Page >> endobj\n" % i for i in range(25)) + b"%%EOF"
    r = upload(client, h, cid, data=pdf, filename="long.pdf")
    assert r.json()["error"]["code"] == "TOO_MANY_PAGES"


def test_no_consent(client):
    h = login(client)
    r = upload(client, h, "does-not-exist")
    assert r.status_code == 400 and r.json()["error"]["code"] == "CONSENT_REQUIRED"


def test_revoked_consent_blocks_upload(client):
    h = login(client)
    cid = give_consent(client, h)
    client.post(f"{API}/consents/{cid}/revoke", headers=h)
    r = upload(client, h, cid)
    assert r.json()["error"]["code"] == "CONSENT_REVOKED"


def test_consent_validation(client):
    h = login(client)
    r = client.post(f"{API}/consents", headers=h, json={"purpose": "LOAN_ASSESSMENT", "range_days": 10})
    assert r.status_code == 422 and r.json()["error"]["code"] == "VALIDATION_ERROR"
    r = client.post(f"{API}/consents", headers=h, json={"purpose": "MARKETING", "range_days": 90})
    assert r.status_code == 422


def test_transactions_grouped_and_masked(client):
    h = login(client)
    cid = give_consent(client, h)
    upload(client, h, cid)
    weeks = client.get(f"{API}/transactions?weeks=12", headers=h).json()["weeks"]
    assert weeks and len(weeks) <= 12
    starts = [w["week_start"] for w in weeks]
    assert starts == sorted(starts, reverse=True)
    allowed = {"id", "date", "amount_paise", "direction", "narration_masked", "category", "kind", "flags",
               "user_corrected"}
    for w in weeks:
        for t in w["txns"]:
            assert set(t) == allowed  # never payee_token or balance


def test_no_score_yet(client):
    h = login(client)
    r = client.get(f"{API}/scores/latest", headers=h)
    assert r.status_code == 404 and r.json()["error"]["code"] == "NO_SCORE"
    r = client.get(f"{API}/offers", headers=h)
    assert r.status_code == 400 and r.json()["error"]["code"] == "NO_SCORE"
