"""Money tab: weekly spending by category and gentle nudges (tasks/02 §2.4, CONTRACTS §5)."""
import math
from collections import defaultdict
from datetime import date, timedelta
from typing import Optional

import numpy as np

from app.scoring.afford import affordability
from app.scoring.engine import round_half_up
from app.scoring.types import Txn
from app.scoring.weekly import detect_recurring_bills, monday, select_window

SPIKE_RATIO = 1.30
SPIKE_MIN_PAISE = 20000      # ₹200
# Day-to-day spending only: monthly bills, rent or money sent home are expected lumps, not spikes.
SPIKE_CATEGORIES = {"FUEL", "FOOD", "SHOPPING", "TRANSPORT", "OTHER"}
PAYDAY_WINDOW_DAYS = 2
BILL_SOON_DAYS = 3
SUGGEST_MIN_PAISE = 2000     # ₹20
MAX_NUDGES = 3


def _weeks(txns: list[Txn], weeks: int) -> list[date]:
    return select_window(txns)[-weeks:] if weeks > 0 else []


def weekly_breakdown(txns: list[Txn], weeks: int = 4) -> dict:
    """Last `weeks` complete weeks: income, spending and spending by category (EXPENSE only), plus the average."""
    window = _weeks(txns, weeks)
    rows = {w: {"income": 0, "expense": 0, "cats": defaultdict(int)} for w in window}
    for t in txns:
        row = rows.get(monday(t.date))
        if row is None:
            continue
        if t.kind == "INCOME":
            row["income"] += t.amount_paise
        elif t.kind == "EXPENSE":
            row["expense"] += t.amount_paise
            row["cats"][t.category] += t.amount_paise
    categories = sorted({c for r in rows.values() for c in r["cats"]})
    avg = {c: round_half_up(sum(r["cats"].get(c, 0) for r in rows.values()) / len(window)) for c in categories}
    return {
        "weeks": [{"week_start": w.isoformat(), "income_paise": rows[w]["income"],
                   "expense_paise": rows[w]["expense"], "by_category": dict(sorted(rows[w]["cats"].items()))}
                  for w in window],
        "avg4_by_category": avg,
    }


def _payday_save(txns: list[Txn], today: date) -> Optional[dict]:
    income = [t for t in txns if t.kind == "INCOME" and t.date <= today]
    payouts = [t for t in income if t.category == "PLATFORM_PAYOUT"] or income
    if not payouts:
        return None
    last_day = max(t.date for t in payouts)
    if (today - last_day).days > PAYDAY_WINDOW_DAYS:
        return None
    amount = sum(t.amount_paise for t in payouts if t.date == last_day)
    surplus = affordability(txns)["median_weekly_surplus_paise"]
    suggest = max(SUGGEST_MIN_PAISE, round_half_up(0.10 * surplus / 1000) * 1000)
    return {"code": "PAYDAY_SAVE", "params": {"amount_paise": amount, "suggest_paise": suggest}}


def _category_spike(txns: list[Txn]) -> Optional[dict]:
    b = weekly_breakdown(txns, 4)
    if not b["weeks"]:
        return None
    last = b["weeks"][-1]["by_category"]
    best = None
    for cat, amount in last.items():
        avg = b["avg4_by_category"].get(cat, 0)
        if cat in SPIKE_CATEGORIES and avg > 0 and amount >= SPIKE_MIN_PAISE and amount >= SPIKE_RATIO * avg:
            pct = round_half_up((amount / avg - 1) * 100)
            if best is None or pct > best[1]:
                best = (cat, pct)
    if best is None:
        return None
    return {"code": "CATEGORY_SPIKE", "params": {"category": best[0], "pct": best[1]}}


def _bill_soon(txns: list[Txn], today: date) -> Optional[dict]:
    upcoming = []
    for payments in detect_recurring_bills(txns, select_window(txns)).values():
        usual = round_half_up(float(np.median([p.date.day for p in payments])))
        for ahead in range(1, BILL_SOON_DAYS + 1):
            day = today + timedelta(days=ahead)
            if day.day == usual:
                upcoming.append((ahead, payments[-1].category, usual))
    if not upcoming:
        return None
    _, category, usual = min(upcoming)
    return {"code": "BILL_SOON", "params": {"category": category, "day": usual}}


def _goal_progress(goal: Optional[dict]) -> Optional[dict]:
    if not goal:
        return None
    weekly = goal.get("weekly_target_paise") or 0
    target = goal.get("target_paise") or 0
    if weekly <= 0 or target <= 0:
        return None
    total = math.ceil(target / weekly)
    done = min(total, (goal.get("saved_paise") or 0) // weekly)
    return {"code": "GOAL_PROGRESS", "params": {"done_weeks": int(done), "total_weeks": int(total)}}


def nudges(txns: list[Txn], today: date, goal: Optional[dict] = None) -> list[dict]:
    """At most 3 nudges, in this order: PAYDAY_SAVE, CATEGORY_SPIKE, BILL_SOON, GOAL_PROGRESS."""
    found = [_payday_save(txns, today), _category_spike(txns), _bill_soon(txns, today), _goal_progress(goal)]
    return [n for n in found if n][:MAX_NUDGES]
