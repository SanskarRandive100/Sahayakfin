"""Finance checks (CONTRACTS §4, §7): loan_max, KFS, schedule and offer matching."""
from datetime import date

import pytest

from app.finance import kfs, loan_max, match_offers, schedule

LENDERS = [
    {"id": "alpha", "name": "MFI Alpha", "min_band": "FAIR", "min_weeks": 8},
    {"id": "beta", "name": "MFI Beta", "min_band": "GOOD", "min_weeks": 10},
    {"id": "gamma", "name": "MFI Gamma", "min_band": "STRONG", "min_weeks": 12},
]
PRODUCTS = [
    {"id": "alpha-weekly", "lender_id": "alpha", "kind": "LOAN", "name": "Alpha Weekly", "min_paise": 200000,
     "max_paise": 1000000, "rate_pct": 24, "fee_pct": 2.0, "tenures": [13, 26, 52]},
    {"id": "beta-flexi", "lender_id": "beta", "kind": "LOAN", "name": "Beta Flexi", "min_paise": 500000,
     "max_paise": 2500000, "rate_pct": 21, "fee_pct": 1.0, "tenures": [26, 52]},
    {"id": "gamma-growth", "lender_id": "gamma", "kind": "LOAN", "name": "Gamma Growth", "min_paise": 1000000,
     "max_paise": 5000000, "rate_pct": 18, "fee_pct": 1.5, "tenures": [26, 52]},
    {"id": "pmsby", "lender_id": "alpha", "kind": "INSURANCE", "name": "Accident cover"},
]


def score(s, band, conf, weeks=12):
    return {"score": s, "band": band, "confidence": conf, "weeks_observed": weeks}


def by_lender(offers):
    return {o["lender"]["id"]: o for o in offers}


def test_loan_max_golden():
    assert loan_max(31100, 24, 26) == 760000


def test_loan_max_zero_safe():
    assert loan_max(0, 24, 26) == 0
    assert loan_max(-500, 24, 26) == 0


def test_kfs_golden():
    k = kfs(750000, 24, 2.0, 26)
    assert k["instalment_paise"] == pytest.approx(30678, abs=1)
    assert k["fee_paise"] == 15000
    assert k["net_disbursed_paise"] == 735000
    assert k["total_repayable_paise"] == pytest.approx(797627, abs=1)
    assert k["total_cost_paise"] == pytest.approx(62627, abs=1)
    assert k["apr_pct"] == 32.0
    assert k["advertised_rate_pct"] == 24 and k["n_instalments"] == 26
    assert k["late_fee_paise"] == 5000 and k["cooling_off_days"] == 3


def test_zero_rate_emi():
    k = kfs(260000, 0, 0, 26)
    assert k["instalment_paise"] == 10000 and k["total_repayable_paise"] == 260000
    assert k["apr_pct"] == 0.0


def test_schedule_weekday_and_total():
    rows = schedule(750000, 24, 26, date(2026, 10, 29), "FRI")
    assert len(rows) == 26
    assert rows[0]["seq"] == 1 and rows[0]["due_date"] == date(2026, 11, 6)
    assert all(r["due_date"].weekday() == 4 for r in rows)
    assert rows[1]["due_date"] == date(2026, 11, 13)
    k = kfs(750000, 24, 2.0, 26)
    assert sum(r["amount_paise"] for r in rows) == k["total_repayable_paise"]
    assert all(r["amount_paise"] == k["instalment_paise"] for r in rows[:-1])


def test_schedule_same_weekday_as_start_plus_seven():
    rows = schedule(200000, 24, 13, date(2026, 10, 30), "FRI")  # a Friday
    assert rows[0]["due_date"] == date(2026, 11, 6)


def test_strong_high_gets_gamma():
    offers = by_lender(match_offers(score(90, "STRONG", "HIGH"), {"safe_weekly_paise": 100000},
                                    LENDERS, PRODUCTS, 2000000))
    assert offers["gamma"]["eligible"] == "ELIGIBLE"
    assert offers["gamma"]["amount_paise"] == 2000000
    assert offers["gamma"]["fits_safe_instalment"] is True
    assert "pmsby" not in [o["product_id"] for o in offers.values()]


def test_eligible_first_then_apr():
    offers = match_offers(score(90, "STRONG", "HIGH"), {"safe_weekly_paise": 100000}, LENDERS, PRODUCTS, 1000000)
    ranks = [o["eligible"] for o in offers]
    assert ranks == sorted(ranks, key=["ELIGIBLE", "NEEDS_REVIEW", "OUTSIDE"].index)
    aprs = [o["kfs"]["apr_pct"] for o in offers if o["eligible"] == "ELIGIBLE"]
    assert aprs == sorted(aprs)


def test_fair_only_alpha_capped():
    offers = by_lender(match_offers(score(50, "FAIR", "HIGH"), {"safe_weekly_paise": 100000},
                                    LENDERS, PRODUCTS, 1000000))
    assert offers["alpha"]["eligible"] in ("ELIGIBLE", "NEEDS_REVIEW")
    assert offers["alpha"]["amount_paise"] == 500000
    assert offers["beta"]["eligible"] == "OUTSIDE" and offers["beta"]["reason"] == "BAND_BELOW_MIN"
    assert offers["gamma"]["eligible"] == "OUTSIDE"


def test_building_gets_no_loans():
    assert match_offers(score(35, "BUILDING", "HIGH"), {"safe_weekly_paise": 100000}, LENDERS, PRODUCTS,
                        1000000) == []


def test_no_confidence_gets_no_loans():
    assert match_offers({"score": None, "band": None, "confidence": "NONE", "weeks_observed": 2},
                        {"safe_weekly_paise": 100000}, LENDERS, PRODUCTS, 1000000) == []


def test_low_confidence_capped_at_3000():
    lenders = [dict(LENDERS[0], min_weeks=4)]
    offers = match_offers(score(85, "STRONG", "LOW", weeks=5), {"safe_weekly_paise": 100000},
                          lenders, PRODUCTS, 1000000)
    assert offers[0]["amount_paise"] == 300000
    assert offers[0]["eligible"] == "ELIGIBLE"


def test_low_confidence_too_few_weeks_for_alpha():
    offers = by_lender(match_offers(score(85, "STRONG", "LOW", weeks=5), {"safe_weekly_paise": 100000},
                                    LENDERS, PRODUCTS, 1000000))
    assert offers["alpha"]["eligible"] == "OUTSIDE" and offers["alpha"]["reason"] == "TOO_FEW_WEEKS"


def test_medium_confidence_half_loan_max_and_review():
    offers = by_lender(match_offers(score(85, "STRONG", "MEDIUM", weeks=10), {"safe_weekly_paise": 31100},
                                    LENDERS, PRODUCTS, 1000000))
    assert offers["alpha"]["amount_paise"] == 380000  # 50% of ₹7,600
    assert offers["alpha"]["eligible"] == "NEEDS_REVIEW"


def test_safe_weekly_zero_gets_no_loans():
    assert match_offers(score(50, "FAIR", "HIGH"), {"safe_weekly_paise": 0}, LENDERS, PRODUCTS, 1000000) == []


def test_below_min_amount():
    offers = by_lender(match_offers(score(90, "STRONG", "HIGH"), {"safe_weekly_paise": 31100},
                                    LENDERS, PRODUCTS, 1000000))
    assert offers["alpha"]["amount_paise"] == 760000 and offers["alpha"]["eligible"] == "ELIGIBLE"
    assert offers["gamma"]["eligible"] == "OUTSIDE" and offers["gamma"]["reason"] == "BELOW_MIN_AMOUNT"


def test_borderline_score_needs_review():
    offers = by_lender(match_offers(score(83, "STRONG", "HIGH"), {"safe_weekly_paise": 100000},
                                    LENDERS, PRODUCTS, 1000000))
    assert offers["gamma"]["eligible"] == "NEEDS_REVIEW"   # 83 is within 5 of STRONG's 80
    assert offers["alpha"]["eligible"] == "ELIGIBLE"


def test_offer_shape():
    o = match_offers(score(90, "STRONG", "HIGH"), {"safe_weekly_paise": 100000}, LENDERS, PRODUCTS, 1000000)[0]
    assert set(o) == {"lender", "product_id", "amount_paise", "weeks", "frequency", "rate_pct", "fee_pct", "kfs",
                      "fits_safe_instalment", "eligible", "reason"}
    assert o["frequency"] == "WEEKLY" and o["weeks"] == 26
