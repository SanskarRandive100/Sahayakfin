"""Bad-week affordability and the income-drop stress test (CONTRACTS §4). Uses smoothed weekly features."""
from collections import Counter
from typing import Optional, Sequence

import numpy as np

from app.finance.kfs import loan_max
from app.scoring.engine import paise
from app.scoring.types import Txn
from app.scoring.weekly import in_window, select_window, weekly_features

WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
LOAN_RATE_PCT = 24
LOAN_TENURES = (13, 26, 52)
SMALL_SAFE_WEEKLY_PAISE = 10000  # below ₹100/week a smaller loan won't help: build a buffer first


def safe_weekly_from_weekly(I: Sequence[float], E: Sequence[float], D: Optional[Sequence[float]] = None) -> dict:
    """Weekly-level affordability in rupees: F_w = I_w - E_w - D_w, safe = min(½·P25(F), ½·P50(I) - mean D)."""
    W = len(I)
    D = list(D) if D is not None else [0.0] * W
    if W == 0:
        return {"p25_surplus": 0.0, "median_surplus": 0.0, "median_income": 0.0, "mean_debt": 0.0,
                "rbi_cap": 0.0, "safe_weekly": 0.0}
    F = [i - e - d for i, e, d in zip(I, E, D)]
    p25f, p50f = float(np.percentile(F, 25)), float(np.median(F))
    p50i, mean_d = float(np.median(I)), float(np.mean(D))
    rbi_cap = 0.5 * p50i - mean_d
    safe = 0.0 if p25f <= 0 else max(0.0, min(0.5 * p25f, rbi_cap))
    return {"p25_surplus": p25f, "median_surplus": p50f, "median_income": p50i, "mean_debt": mean_d,
            "rbi_cap": max(0.0, rbi_cap), "safe_weekly": safe}


def payout_weekday(txns: list[Txn]) -> str:
    """Most common weekday of platform payouts, else of all income (ties → earlier weekday)."""
    window = select_window(txns)
    scope = in_window(txns, window) or txns
    for pick in (lambda t: t.kind == "INCOME" and t.category == "PLATFORM_PAYOUT", lambda t: t.kind == "INCOME"):
        days = Counter(t.date.weekday() for t in scope if pick(t))
        if days:
            best = max(days.items(), key=lambda kv: (kv[1], -kv[0]))[0]
            return WEEKDAYS[best]
    return "MON"


def current_balance_paise(txns: list[Txn]) -> Optional[int]:
    """Balance on the last statement row that has one (statement order within the last day)."""
    last = None
    for t in sorted(txns, key=lambda t: t.date):
        if t.balance_paise is not None:
            last = t.balance_paise
    return last


def _weeks(txns: list[Txn], existing_weekly_debt_paise: Optional[int]):
    weeks = weekly_features(txns, smooth=True)
    I = [w.income for w in weeks]
    E = [w.expense for w in weeks]
    D = [w.debt for w in weeks] if existing_weekly_debt_paise is None else \
        [existing_weekly_debt_paise / 100] * len(weeks)
    return weeks, I, E, D


def affordability(txns: list[Txn], existing_weekly_debt_paise: Optional[int] = None) -> dict:
    _, I, E, D = _weeks(txns, existing_weekly_debt_paise)
    a = safe_weekly_from_weekly(I, E, D)
    safe = paise(a["safe_weekly"])
    return {
        "safe_weekly_paise": safe,
        "p25_weekly_surplus_paise": paise(a["p25_surplus"]),
        "median_weekly_surplus_paise": paise(a["median_surplus"]),
        "median_weekly_income_paise": paise(a["median_income"]),
        "existing_weekly_debt_paise": paise(a["mean_debt"]),
        "rbi_cap_weekly_paise": paise(a["rbi_cap"]),
        "payout_weekday": payout_weekday(txns),
        "loan_max_paise": {str(n): loan_max(safe, LOAN_RATE_PCT, n) for n in LOAN_TENURES},
    }


def stress_test(txns: list[Txn], shock: float, weekly_instalment_paise: int) -> dict:
    """Would the instalment still be paid if income fell by `shock` (flexible spending falls with it)?"""
    weeks, I, E, D = _weeks(txns, None)
    W = len(weeks)
    inst = weekly_instalment_paise / 100
    covered = 0
    shortfall = 0.0
    series = []
    for w in weeks:
        surplus = w.income - w.expense_fixed - w.expense_flex - w.debt
        f = (1 - shock) * w.income - w.expense_fixed - (1 - shock) * w.expense_flex - w.debt
        # When flexible spending exceeds income, the formula would make a drop look helpful; it never is.
        f = min(f, surplus)
        if f >= inst - 1e-9:
            covered += 1
        shortfall += max(0.0, inst - f)
        series.append({"week_start": w.week_start.isoformat(), "surplus_paise": paise(surplus),
                       "stressed_surplus_paise": paise(f)})
    shortfall_paise = paise(shortfall)

    last_balance = current_balance_paise(txns)
    buffer_covers = last_balance is not None and last_balance >= shortfall_paise

    # GREEN needs income alone to cover 10 of 12 weeks; a savings buffer can lift a result only to AMBER.
    if W and covered * 12 >= 10 * W:
        light = "GREEN"
    elif W and (covered * 12 >= 7 * W or buffer_covers):
        light = "AMBER"
    else:
        light = "RED"

    if light == "GREEN":
        advice = "OK"
    elif light == "AMBER":
        advice = "RELIES_ON_SAVINGS" if buffer_covers else "CONSIDER_LONGER_TENURE"
    else:
        safe = paise(safe_weekly_from_weekly(I, E, D)["safe_weekly"])
        advice = "BUILD_BUFFER_FIRST" if safe < SMALL_SAFE_WEEKLY_PAISE else "TAKE_SMALLER_AMOUNT"

    return {"weeks_covered": covered, "weeks_total": W, "light": light, "buffer_covers": buffer_covers,
            "shortfall_paise": shortfall_paise, "shortfall_weeks": W - covered, "advice": advice,
            "current_balance_paise": last_balance, "series": series}
