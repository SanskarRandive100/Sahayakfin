"""Repayment rounding, changed lender rules, request bounds and supported tenures."""
from copy import deepcopy
from datetime import date, timedelta

import pytest

from app.finance import kfs, loan_max, match_offers, schedule
from test_finance import LENDERS, PRODUCTS, score


@pytest.mark.parametrize("weeks", [13, 26, 52])
@pytest.mark.parametrize("rate", [0, 18, 21, 24])
def test_schedule_matches_cost_card_exactly(weeks, rate):
    principal = 731123
    card = kfs(principal, rate, 2, weeks)
    rows = schedule(principal, rate, weeks, date(2026, 10, 29), "FRI")
    assert len(rows) == weeks
    assert sum(r["amount_paise"] for r in rows) == card["total_repayable_paise"]
    assert all(type(r["amount_paise"]) is int and r["amount_paise"] > 0 for r in rows)
    assert all(type(r["due_date"]) is date and r["due_date"].weekday() == 4 for r in rows)
    assert all(b["due_date"] - a["due_date"] == timedelta(days=7) for a, b in zip(rows, rows[1:]))
    assert card["total_cost_paise"] == card["total_repayable_paise"] - card["net_disbursed_paise"]
    assert all(type(v) is int for key, v in card.items() if key.endswith("_paise"))


@pytest.mark.parametrize("requested", [-100000, 0, 199999, 10 ** 40])
def test_request_amount_cannot_exceed_product_or_budget(requested):
    offers = match_offers(score(90, "STRONG", "HIGH"), {"safe_weekly_paise": 31100},
                          LENDERS, PRODUCTS, requested)
    for offer in offers:
        product = next(p for p in PRODUCTS if p["id"] == offer["product_id"])
        assert type(offer["amount_paise"]) is int
        assert 0 <= offer["amount_paise"] <= min(product["max_paise"], loan_max(31100, product["rate_pct"], offer["weeks"]))
        assert offer["amount_paise"] % 10000 == 0
        if offer["amount_paise"] < product["min_paise"]:
            assert offer["eligible"] == "OUTSIDE"


@pytest.mark.parametrize("cap", [0, 300000, 500000])
def test_new_lender_limit_takes_effect_without_mutating_inputs(cap):
    lenders, products = deepcopy(LENDERS), deepcopy(PRODUCTS)
    lenders[0]["max_amount_paise"] = cap
    original = deepcopy(lenders)
    offers = match_offers(score(90, "STRONG", "HIGH"), {"safe_weekly_paise": 100000},
                          lenders, products, 1000000)
    alpha = next(o for o in offers if o["lender"]["id"] == "alpha")
    assert alpha["amount_paise"] <= cap
    if cap == 0:
        assert alpha["eligible"] == "OUTSIDE" and alpha["reason"] == "BELOW_MIN_AMOUNT"
    assert lenders == original and products == PRODUCTS


@pytest.mark.parametrize("tenures,expected", [([13], 13), ([52], 52), ([13, 52], 13), ([52, 26], 26)])
def test_only_allowed_tenures_are_used(tenures, expected):
    product = dict(PRODUCTS[0], tenures=tenures)
    offers = match_offers(score(90, "STRONG", "HIGH"), {"safe_weekly_paise": 100000},
                          LENDERS, [product], 1000000)
    assert offers[0]["weeks"] == expected


def test_changed_band_and_history_rules_reject_previous_eligibility():
    lenders = [dict(LENDERS[0], min_band="STRONG", min_weeks=13)]
    offers = match_offers(score(90, "STRONG", "HIGH"), {"safe_weekly_paise": 100000},
                          lenders, PRODUCTS, 1000000)
    assert len(offers) == 1 and offers[0]["eligible"] == "OUTSIDE"
    assert offers[0]["reason"] == "TOO_FEW_WEEKS"
