"""STUB (1.1): returns the CONTRACTS §3.1 example."""
import copy
from datetime import date

EXAMPLE = {
    "score": 81, "band": "STRONG", "confidence": "HIGH", "provisional": False,
    "weeks_observed": 12, "as_of": "2026-10-25",
    "components": {
        "income_stability": {"value": 97.5, "weight": 0.30, "available": True},
        "savings_habit": {"value": 50.0, "weight": 0.25, "available": True},
        "bill_discipline": {"value": 83.33, "weight": 0.25, "available": True},
        "expense_health": {"value": 91.67, "weight": 0.20, "available": True},
    },
    "metrics": {"median_weekly_income_paise": 500000, "p25_weekly_income_paise": 487500,
                "expense_ratio": 0.8414, "weeks_in_surplus": 10, "bills_on_time": 5,
                "bills_total": 6, "bounces": 0, "savings_weeks": 6, "categorised_share": 0.93},
    "reasons": [{"code": "FEW_SAVINGS_WEEKS", "component": "savings_habit", "params": {"weeks": 6, "of": 12}},
                {"code": "BILLS_LATE", "component": "bill_discipline", "params": {"late": 1, "of": 6}}],
    "tips": [{"code": "SAVE_EVERY_WEEK", "points": 13, "params": {"min_amount_paise": 2000}},
             {"code": "PAY_BILLS_ON_TIME", "points": 4, "params": {}}],
    "engine_version": "fts-2.0",
}


def score_from_weekly(I, E, saved, bills_on_time, bills_total, bounces, D=None) -> dict:
    return copy.deepcopy(EXAMPLE)


def compute_score(txns, as_of: date | None = None) -> dict:
    return copy.deepcopy(EXAMPLE)
