"""Window, zero-income, seasonal and stressed-budget checks beyond persona fixtures."""
from dataclasses import replace
from datetime import timedelta

import pytest

from app.scoring import affordability, compute_score, score_from_weekly, stress_test
from app.scoring.engine import band_of, round_half_up
from app.scoring.weekly import weekly_features
from test_scoring_edge import MON, steady, txn


@pytest.mark.parametrize("value,expected", [(39.5, "FAIR"), (59.5, "GOOD"), (79.5, "STRONG")])
def test_bands_use_round_half_up(value, expected):
    assert band_of(round_half_up(value)) == expected


def test_debt_smoothing_conserves_total_without_double_counting_expense():
    base = steady()
    debts = [txn(MON + timedelta(weeks=w, days=2), 300000, "DR", "EMI", "DEBT", token="P-DEBT")
             for w in (0, 4, 8)]
    raw = weekly_features(base + debts)
    smooth = weekly_features(base + debts, smooth=True)
    assert sum(w.expense for w in smooth) == pytest.approx(sum(w.expense for w in weekly_features(base, smooth=True)))
    assert sum(w.debt for w in smooth) == pytest.approx(sum(w.debt for w in raw))
    assert all(w.debt == 750 for w in smooth)
    assert affordability(base + debts)["safe_weekly_paise"] < affordability(base)["safe_weekly_paise"]


def test_as_of_excludes_partial_current_week():
    txns = steady(weeks=14)
    baseline = compute_score(txns, as_of=MON + timedelta(weeks=12, days=6))
    partial = compute_score(txns, as_of=MON + timedelta(weeks=13, days=3))
    assert baseline["metrics"] == partial["metrics"]
    assert baseline["weeks_observed"] == partial["weeks_observed"] == 12


def test_seasonal_income_is_not_treated_as_steady_wealth():
    seasonal = score_from_weekly([0, 0, 0, 20000] * 3, [1000] * 12, [False] * 12, 0, 0, 0)
    assert seasonal["score"] is None and seasonal["confidence"] == "NONE"
    assert seasonal["components"]["savings_habit"]["value"] == 0


@pytest.mark.parametrize("income", [0, 100000])
def test_huge_outflows_never_create_safe_loan(income):
    txns = steady(income=income, spend=10 ** 10)
    assert affordability(txns)["safe_weekly_paise"] == 0
    assert all(v == 0 for v in affordability(txns)["loan_max_paise"].values())
    score = compute_score(txns)["score"]
    assert score is None or 0 <= score <= 100


def test_shock_with_unknown_or_depleted_buffer_cannot_improve_coverage():
    txns = steady(income=100000, spend=150000)
    for balance in (None, 0, -100):
        rows = [replace(t, balance_paise=balance) for t in txns]
        results = [stress_test(rows, shock, 10000) for shock in (0, .1, .2, .3)]
        assert all(not r["buffer_covers"] and r["light"] == "RED" for r in results)
        assert [r["weeks_covered"] for r in results] == sorted((r["weeks_covered"] for r in results), reverse=True)
        assert [r["shortfall_paise"] for r in results] == sorted(r["shortfall_paise"] for r in results)
        assert all(w["stressed_surplus_paise"] <= w["surplus_paise"] for r in results for w in r["series"])
