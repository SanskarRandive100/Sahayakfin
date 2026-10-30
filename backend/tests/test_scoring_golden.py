"""Golden vectors (CONTRACTS §7). Tolerance ±0.01 on components and FTS."""
import pytest

from app.scoring.afford import safe_weekly_from_weekly
from app.scoring.engine import band, components, fts, score_from_weekly

A_I = [5000, 5200, 4800, 5100, 3000, 5000, 5300, 4900, 5100, 2500, 5000, 5200]
A_E = [4000, 4100, 3900, 4200, 3500, 4000, 4300, 3800, 4100, 3200, 4000, 4100]
A_S = [1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0]
B_I = [9000, 3000, 15000, 6000, 12000, 4000, 16000, 8000, 3500, 11000, 9500, 7000]
B_E = [7000, 6500, 7500, 6800, 7200, 6000, 7800, 6900, 6200, 7100, 7000, 6600]
B_S = [0] * 12
D_I = [3500, 3600, 3400, 3500, 3550]
D_E = [2900, 3000, 2800, 2950, 2900]
D_S = [1, 0, 1, 0, 1]

approx = lambda x: pytest.approx(x, abs=0.01)  # noqa: E731


def comp_values(result):
    return {k: v["value"] for k, v in result["components"].items()}


def test_vector_a():
    c = components(A_I, A_E, A_S, 5, 6, 0)
    assert c["income_stability"] == approx(97.5)
    assert c["savings_habit"] == approx(50.0)
    assert c["bill_discipline"] == approx(83.33)
    assert c["expense_health"] == approx(91.67)
    assert fts(c) == approx(80.92)
    r = score_from_weekly(A_I, A_E, A_S, 5, 6, 0)
    assert r["score"] == 81 and r["band"] == "STRONG"
    assert r["confidence"] == "HIGH" and r["provisional"] is False
    assert r["metrics"]["expense_ratio"] == approx(0.8414)
    assert r["metrics"]["weeks_in_surplus"] == 10
    assert r["metrics"]["median_weekly_income_paise"] == 500000
    assert r["metrics"]["p25_weekly_income_paise"] == 487500
    assert r["engine_version"] == "fts-2.0"


def test_vector_a_affordability():
    a = safe_weekly_from_weekly(A_I, A_E)
    assert a["p25_surplus"] == approx(900)
    assert a["safe_weekly"] == approx(450.0)


def test_vector_b():
    c = components(B_I, B_E, B_S, 3, 6, 1)
    assert c["income_stability"] == approx(64.71)
    assert c["savings_habit"] == approx(0.0)
    assert c["bill_discipline"] == approx(25.0)
    assert c["expense_health"] == approx(83.33)
    assert fts(c) == approx(42.33)
    r = score_from_weekly(B_I, B_E, B_S, 3, 6, 1)
    assert r["score"] == 42 and r["band"] == "FAIR"
    assert r["metrics"]["expense_ratio"] == approx(0.7942)
    assert r["metrics"]["weeks_in_surplus"] == 8
    a = safe_weekly_from_weekly(B_I, B_E)
    assert a["p25_surplus"] == approx(-1100)
    assert a["safe_weekly"] == 0


def test_vector_c_bills_unavailable():
    c = components(A_I, A_E, A_S, 0, 0, 0)
    assert c["bill_discipline"] is None
    assert fts(c) == approx(80.11)
    r = score_from_weekly(A_I, A_E, A_S, 0, 0, 0)
    assert r["score"] == 80 and r["band"] == "STRONG"
    assert r["components"]["bill_discipline"]["available"] is False


def test_vector_d_thin():
    c = components(D_I, D_E, D_S, 2, 2, 0)
    assert c == {"income_stability": approx(100), "savings_habit": approx(60), "bill_discipline": approx(100),
                 "expense_health": approx(100)}
    assert fts(c) == approx(90.0)
    r = score_from_weekly(D_I, D_E, D_S, 2, 2, 0)
    assert r["score"] == 90
    assert r["confidence"] == "LOW" and r["provisional"] is True
    assert "THIN_FILE" in [x["code"] for x in r["reasons"]]
    add = [t for t in r["tips"] if t["code"] == "ADD_MORE_HISTORY"][0]
    assert add["params"] == {"weeks_needed": 7}


def test_scale_invariance():
    r1 = fts(components(A_I, A_E, A_S, 5, 6, 0))
    r2 = fts(components([x * 2 for x in A_I], [x * 2 for x in A_E], A_S, 5, 6, 0))
    assert r2 == approx(80.92) and r1 == approx(r2)


@pytest.mark.parametrize("R,expected", [(0.85, 100), (1.00, 66.67), (1.20, 0), (1.35, 0)])
def test_band_of_expense_ratio(R, expected):
    assert band(R) == approx(expected)


def test_reasons_a():
    r = score_from_weekly(A_I, A_E, A_S, 5, 6, 0)
    assert [x["code"] for x in r["reasons"]] == ["FEW_SAVINGS_WEEKS", "BILLS_LATE"]
    assert r["reasons"][0]["params"] == {"weeks": 6, "of": 12}
    assert r["reasons"][1]["params"] == {"late": 1, "of": 6}
    assert [(t["code"], t["points"]) for t in r["tips"]] == [("SAVE_EVERY_WEEK", 13), ("PAY_BILLS_ON_TIME", 4)]
    assert r["tips"][0]["params"]["min_amount_paise"] == 2000
    assert r["tips"][0]["params"]["saved_weeks"] == 6 and r["tips"][0]["params"]["of"] == 12
    assert r["tips"][0]["params"]["suggest_paise"] >= 2000 and r["tips"][0]["params"]["suggest_paise"] % 1000 == 0


def test_reasons_b():
    r = score_from_weekly(B_I, B_E, B_S, 3, 6, 1)
    assert [x["code"] for x in r["reasons"]] == ["NO_SAVINGS_SEEN", "BILL_BOUNCE"]
    assert [(t["code"], t["points"]) for t in r["tips"]] == [("SAVE_EVERY_WEEK", 25), ("PAY_BILLS_ON_TIME", 19)]


def test_steady_income_tip_reaches_full_stability():
    from app.scoring.engine import apply_tip
    from app.scoring.weekly import WeeklyInputs

    inp = WeeklyInputs(I=B_I, E=B_E, D=[0] * 12, saved=B_S, E_smooth=B_E, bills_on_time=3, bills_total=6,
                       bounces=1, categorised_share=1, cash_share=0, as_of=None)
    new = apply_tip(inp, "STEADY_INCOME")
    assert components(new.I, new.E, new.saved, 3, 6, 1)["income_stability"] == approx(100)


def test_median_income_zero_means_no_score():
    r = score_from_weekly([0, 0, 0, 0, 5000, 0], [100] * 6, [0] * 6, 0, 0, 0)
    assert r["score"] is None and r["band"] is None
    assert r["confidence"] == "NONE"


def test_three_weeks_means_no_score():
    r = score_from_weekly([5000, 5000, 5000], [4000] * 3, [1, 1, 1], 1, 1, 0)
    assert r["score"] is None and r["confidence"] == "NONE"
    assert [x["code"] for x in r["reasons"]] == ["THIN_FILE"]
    assert [t["code"] for t in r["tips"]] == ["ADD_MORE_HISTORY"]
    assert r["tips"][0]["params"] == {"weeks_needed": 9}


def test_result_shape_matches_contract():
    r = score_from_weekly(A_I, A_E, A_S, 5, 6, 0)
    assert set(r) == {"score", "band", "confidence", "provisional", "weeks_observed", "as_of", "components",
                      "metrics", "reasons", "tips", "engine_version"}
    assert set(r["components"]) == {"income_stability", "savings_habit", "bill_discipline", "expense_health"}
    assert set(r["metrics"]) == {"median_weekly_income_paise", "p25_weekly_income_paise", "expense_ratio",
                                 "weeks_in_surplus", "bills_on_time", "bills_total", "bounces", "savings_weeks",
                                 "categorised_share", "weekly"}


def test_weekly_series_from_weekly_lists():
    w = score_from_weekly(A_I, A_E, A_S, 5, 6, 0)["metrics"]["weekly"]
    assert len(w) == 12
    assert w[0] == {"week_start": None, "income_paise": 500000, "expense_paise": 400000,
                    "surplus_paise": 100000, "saved": True}
    assert [x["saved"] for x in w] == [bool(s) for s in A_S]
    assert w[9]["surplus_paise"] == -70000
