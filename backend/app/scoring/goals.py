"""Savings-goal planner: required weekly saving for a target date, judged against the user's weekly surplus."""
import math
from datetime import date, timedelta
from typing import Optional

STEP_PAISE = 1000  # ₹10
FLEX_CATEGORIES = ("FUEL", "FOOD", "SHOPPING", "TRANSPORT", "OTHER", "CASH_WITHDRAWAL")
CUT_SHARE = 0.10
SPIKE_RATIO = 1.5


def _ceil_step(paise: float) -> int:
    return int(math.ceil(paise / STEP_PAISE)) * STEP_PAISE


def _floor_step(paise: float) -> int:
    return int(math.floor(paise / STEP_PAISE)) * STEP_PAISE


def plan_goal(target_paise: int, saved_paise: int, target_date: date, today: date,
              median_surplus_paise: int) -> dict:
    """weeks_left = ceil(days/7); required weekly rounded up to ₹10. ON_TRACK ≤ 50% of the median weekly
    surplus, STRETCH ≤ 100%, NOT_FEASIBLE above that (with a later date and a smaller amount that would fit 50%)."""
    remaining = max(0, target_paise - saved_paise)
    weeks_left = max(1, math.ceil((target_date - today).days / 7))
    required = _ceil_step(remaining / weeks_left) if remaining else 0
    surplus = max(0, int(median_surplus_paise))
    comfortable = surplus * 0.5
    if required <= comfortable:
        status = "ON_TRACK"
    elif required <= surplus:
        status = "STRETCH"
    else:
        status = "NOT_FEASIBLE"
    out = {"weeks_left": weeks_left, "required_weekly_paise": required, "status": status,
           "suggested_date": None, "suggested_amount_paise": None}
    if status == "NOT_FEASIBLE":
        if comfortable > 0:
            weeks_needed = math.ceil(remaining / comfortable)
            out["suggested_date"] = (today + timedelta(days=7 * weeks_needed)).isoformat()
        out["suggested_amount_paise"] = saved_paise + _floor_step(comfortable * weeks_left)
    return out


def saving_suggestions(breakdown: dict, top: int = 2) -> list[dict]:
    """Top flexible categories by 4-week average: a 10% cut and whether this week spiked (≥ 1.5× average)."""
    avg = breakdown.get("avg4_by_category") or {}
    weeks = breakdown.get("weeks") or []
    latest = (weeks[-1].get("by_category") if weeks else None) or {}
    cats = sorted((c for c in FLEX_CATEGORIES if avg.get(c, 0) > 0), key=lambda c: -avg[c])[:top]
    out = []
    for c in cats:
        saves = _floor_step(CUT_SHARE * avg[c])
        if saves <= 0:
            continue
        this_week = int(latest.get(c, 0))
        out.append({"category": c, "avg_weekly_paise": int(avg[c]), "saves_paise": saves,
                    "this_week_paise": this_week, "spiked": this_week >= SPIKE_RATIO * avg[c]})
    return out
