from tests.conftest import login, onboard

API = "/api/v1"


def acceptable(offers):
    return [o for o in offers["loans"] if o["eligible"] in ("ELIGIBLE", "NEEDS_REVIEW") and o["fits_safe_instalment"]]


def test_offers_shape(client):
    h, _ = onboard(client)
    r = client.get(f"{API}/offers?requested_paise=1000000", headers=h)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["requested_paise"] == 1000000 and "safe_amount_paise" in body
    # Safe-zone meter: our safe amount never exceeds RBI's 50%-of-income cap.
    assert body["rbi_cap_amount_paise"] >= body["safe_amount_paise"]
    assert all("id" in o and "kfs" in o for o in body["loans"])
    assert len(body["insurance"]) == 3 and all(i["demo"] for i in body["insurance"])
    assert any(i["is_govt_scheme"] for i in body["insurance"])


def test_offer_amount_validation(client):
    h, _ = onboard(client)
    assert client.get(f"{API}/offers?requested_paise=0", headers=h).status_code == 422
    assert client.get(f"{API}/offers?requested_paise=20000000", headers=h).status_code == 422


def test_accept_creates_schedule(client):
    h, _ = onboard(client)
    offers = client.get(f"{API}/offers", headers=h).json()
    o = acceptable(offers)[0]
    r = client.post(f"{API}/offers/{o['id']}/accept", headers=h,
                    json={"amount_paise": o["amount_paise"], "weeks": o["weeks"]})
    assert r.status_code == 200, r.text
    loan = r.json()
    assert len(loan["schedule"]) == o["weeks"]
    assert all(s["status"] == "UPCOMING" for s in loan["schedule"])
    # Accepting twice is refused.
    r2 = client.post(f"{API}/offers/{o['id']}/accept", headers=h,
                     json={"amount_paise": o["amount_paise"], "weeks": o["weeks"]})
    assert r2.json()["error"]["code"] == "OFFER_NOT_ACCEPTABLE"
    loans = client.get(f"{API}/loans", headers=h).json()
    assert len(loans) == 1 and client.get(f"{API}/me", headers=h).json()["has_loan"]


def test_outside_offer_not_acceptable(client):
    h, _ = onboard(client)
    outside = [o for o in client.get(f"{API}/offers", headers=h).json()["loans"] if o["eligible"] == "OUTSIDE"]
    if outside:
        r = client.post(f"{API}/offers/{outside[0]['id']}/accept", headers=h, json={"amount_paise": 500000, "weeks": 26})
        assert r.json()["error"]["code"] == "OFFER_NOT_ACCEPTABLE"


def test_exceeds_safe_instalment(client):
    h, _ = onboard(client)
    afford = client.get(f"{API}/affordability", headers=h).json()
    offers = client.get(f"{API}/offers", headers=h).json()
    o = acceptable(offers)[0]
    # The biggest amount at the shortest tenure must break the safe weekly limit for a gig worker.
    products_max = 10_000_000
    r = client.post(f"{API}/offers/{o['id']}/accept", headers=h, json={"amount_paise": products_max, "weeks": 13})
    assert r.status_code in (400, 422)
    assert r.json()["error"]["code"] in ("EXCEEDS_SAFE_INSTALMENT", "OFFER_NOT_ACCEPTABLE", "VALIDATION_ERROR")
    assert afford["safe_weekly_paise"] >= 0


def test_other_users_offer_is_404(client):
    h1, _ = onboard(client)
    h2 = login(client)
    o = client.get(f"{API}/offers", headers=h1).json()["loans"][0]
    r = client.post(f"{API}/offers/{o['id']}/accept", headers=h2, json={"amount_paise": 500000, "weeks": 26})
    assert r.status_code == 404
