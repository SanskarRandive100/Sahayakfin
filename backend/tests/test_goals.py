"""Goal planner maths (v1.1) and the goal/contribute/stretch endpoints."""
from datetime import date, timedelta

from app.scoring.goals import plan_goal, saving_suggestions
from tests.conftest import give_consent, login, upload

API = "/api/v1"
TODAY = date(2026, 10, 30)


def test_required_weekly_rounds_up_to_ten_rupees():
    p = plan_goal(800000, 0, TODAY + timedelta(days=70), TODAY, 400000)  # ₹8,000 in 10 weeks, surplus ₹4,000
    assert p["weeks_left"] == 10 and p["required_weekly_paise"] == 80000 and p["status"] == "ON_TRACK"
    p = plan_goal(100000, 1000, TODAY + timedelta(days=20), TODAY, 400000)  # 3 weeks for ₹990 → ₹330
    assert p["weeks_left"] == 3 and p["required_weekly_paise"] == 33000


def test_status_thresholds():
    d = TODAY + timedelta(days=70)
    assert plan_goal(2000000, 0, d, TODAY, 400000)["status"] == "ON_TRACK"     # 2000 = 50%
    assert plan_goal(3000000, 0, d, TODAY, 400000)["status"] == "STRETCH"      # 3000 ≤ 100%
    p = plan_goal(5000000, 0, d, TODAY, 400000)                                # 5000 > 100%
    assert p["status"] == "NOT_FEASIBLE"
    assert p["suggested_date"] == (TODAY + timedelta(days=7 * 25)).isoformat()  # 50,000 / 2,000
    assert p["suggested_amount_paise"] == 2000000


def test_no_surplus_is_not_feasible():
    p = plan_goal(100000, 0, TODAY + timedelta(days=28), TODAY, 0)
    assert p["status"] == "NOT_FEASIBLE" and p["suggested_date"] is None and p["suggested_amount_paise"] == 0


def test_saving_suggestions_top_two_flexible():
    b = {"avg4_by_category": {"FUEL": 110000, "FOOD": 50000, "RENT": 900000, "SHOPPING": 20000},
         "weeks": [{"by_category": {"FUEL": 200000, "FOOD": 40000}}]}
    s = saving_suggestions(b)
    assert [x["category"] for x in s] == ["FUEL", "FOOD"]
    assert s[0]["saves_paise"] == 11000 and s[0]["spiked"] and not s[1]["spiked"]


def test_goal_endpoints(client):
    h = login(client, "9000000001")
    client.post(f"{API}/demo/reset", headers=h)
    upload(client, h, give_consent(client, h))
    target_date = (date.today() + timedelta(days=60)).isoformat()
    r = client.post(f"{API}/goals", headers=h, json={"name": "Phone", "target_paise": 800000,
                                                      "target_date": target_date, "saved_paise": 100000})
    assert r.status_code == 200, r.text
    g = r.json()
    assert g["status"] in ("ON_TRACK", "STRETCH", "NOT_FEASIBLE") and g["required_weekly_paise"] > 0
    r = client.post(f"{API}/goals/{g['id']}/contribute", headers=h, json={"amount_paise": 50000})
    assert r.status_code == 200 and r.json()["saved_paise"] == 150000
    too_soon = (date.today() + timedelta(days=3)).isoformat()
    assert client.post(f"{API}/goals", headers=h, json={"name": "X", "target_paise": 800000,
                                                        "target_date": too_soon}).status_code == 422
    o = client.get(f"{API}/offers?requested_paise=1000000", headers=h).json()
    assert "stretch" in o and "safe_amount_52_paise" in o
    for s in o["stretch"]:
        assert s["eligible"] == "NEEDS_APPROVAL" and s["amount_paise"] == 1000000
        assert {"weekly_over_safe_paise", "weeks_covered", "weeks_total", "light"} <= set(s["risk"])
