"""Window selection, weekly aggregation, recurring-bill detection and bill smoothing (CONTRACTS §1, §3)."""
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Iterable, Optional

import numpy as np

from app.scoring.types import Txn, WeekFeature

MAX_WEEKS = 12
BILL_CATEGORIES = {"BILLS", "PHONE", "RENT", "EMI"}
FIXED_CATEGORIES = {"RENT", "BILLS", "PHONE", "FAMILY", "HEALTH", "EDUCATION", "FEES_CHARGES"}
ON_TIME_DAYS = 5


def monday(d: date) -> date:
    return d - timedelta(days=d.weekday())


def select_window(txns: list[Txn], as_of: Optional[date] = None) -> list[date]:
    """Mondays of the last 12 complete Mon–Sun weeks that end on/before as_of and start on/after the first txn."""
    if not txns:
        return []
    first = min(t.date for t in txns)
    last = as_of or max(t.date for t in txns)
    m = monday(last) if last.weekday() == 6 else monday(last) - timedelta(days=7)
    weeks = []
    while m >= first and len(weeks) < MAX_WEEKS:
        weeks.append(m)
        m -= timedelta(days=7)
    return sorted(weeks)


def in_window(txns: Iterable[Txn], window: list[date]) -> list[Txn]:
    ws = set(window)
    return [t for t in txns if monday(t.date) in ws]


def detect_recurring_bills(txns: list[Txn], window: list[date]) -> dict[str, list[Txn]]:
    """Payees (token, else category) with >= 2 DR payments in BILLS/PHONE/RENT/EMI inside the window."""
    groups: dict[str, list[Txn]] = defaultdict(list)
    for t in in_window(txns, window):
        if t.direction == "DR" and t.category in BILL_CATEGORIES and t.kind != "IGNORED":
            groups[t.payee_token or t.category].append(t)
    return {k: sorted(v, key=lambda t: t.date) for k, v in groups.items() if len(v) >= 2}


def circular_day_diff(d: float, usual: float) -> float:
    diff = abs(d - usual)
    return min(diff, 30 - diff)


def bill_stats(recurring: dict[str, list[Txn]], txns: Iterable[Txn] = (),
               window: Optional[list[date]] = None) -> tuple[int, int, int]:
    """(on_time, total, bounces). A payment is on time within 5 days (circular) of the payee's median day."""
    on_time = total = 0
    for payments in recurring.values():
        usual = float(np.median([p.date.day for p in payments]))
        for p in payments:
            total += 1
            if circular_day_diff(p.date.day, usual) <= ON_TIME_DAYS:
                on_time += 1
    scope = in_window(txns, window) if window is not None else list(txns)
    bounces = sum(1 for t in scope if "BOUNCE" in t.flags)
    return on_time, total, bounces


def weekly_features(txns: list[Txn], as_of: Optional[date] = None, smooth: bool = False) -> list[WeekFeature]:
    """One WeekFeature (rupees) per window week. smooth=True spreads recurring bill payees evenly over the weeks."""
    window = select_window(txns, as_of)
    if not window:
        return []
    idx = {w: i for i, w in enumerate(window)}
    n = len(window)
    income = [0] * n
    expense = [0] * n
    debt = [0] * n
    fixed = [0] * n
    flex = [0] * n
    saved_txn = [False] * n
    closing: list[Optional[int]] = [None] * n
    prior_balance: Optional[int] = None

    smoothed_ids: set[str] = set()
    spread_expense = spread_debt = 0.0
    if smooth:
        for payments in detect_recurring_bills(txns, window).values():
            for p in payments:
                smoothed_ids.add(p.id)
                if p.kind == "DEBT":
                    spread_debt += p.amount_paise
                else:
                    spread_expense += p.amount_paise

    seen_balance = False
    for t in sorted(txns, key=lambda t: t.date):  # stable: keeps statement order within a day
        i = idx.get(monday(t.date))
        if i is None:
            if t.date < window[0] and t.balance_paise is not None:
                prior_balance, seen_balance = t.balance_paise, True
            continue
        if t.balance_paise is not None:
            if not seen_balance:  # statement starts inside the window: opening = balance before this row
                signed = t.amount_paise if t.direction == "CR" else -t.amount_paise
                prior_balance = t.balance_paise - signed
                seen_balance = True
            closing[i] = t.balance_paise
        if t.id in smoothed_ids:
            continue
        if t.kind == "INCOME":
            income[i] += t.amount_paise
        elif t.kind == "EXPENSE":
            expense[i] += t.amount_paise
            if t.category in FIXED_CATEGORIES:
                fixed[i] += t.amount_paise
            else:
                flex[i] += t.amount_paise
        elif t.kind == "DEBT":
            debt[i] += t.amount_paise
        elif t.kind == "SAVINGS":
            saved_txn[i] = True

    # Balance-growth savings rule: closing - previous closing >= max(₹20, 2% of median weekly income).
    threshold = max(2000.0, 0.02 * float(np.median(income)))
    prev = prior_balance
    saved = []
    for i in range(n):
        if closing[i] is None:
            closing[i] = prev  # no transactions that week: balance unchanged
        grew = closing[i] is not None and prev is not None and closing[i] - prev >= threshold
        saved.append(saved_txn[i] or grew)
        prev = closing[i]

    se, sd = spread_expense / n, spread_debt / n
    return [WeekFeature(week_start=window[i],
                        income=income[i] / 100,
                        expense=(expense[i] + se) / 100,
                        debt=(debt[i] + sd) / 100,
                        saved=saved[i],
                        expense_fixed=(fixed[i] + se) / 100,
                        expense_flex=flex[i] / 100,
                        closing_balance=None if closing[i] is None else closing[i] / 100)
            for i in range(n)]


@dataclass
class WeeklyInputs:
    """Everything the engine needs from a statement, computed once (also used by what_if / fairness)."""
    I: list[float]
    E: list[float]
    D: list[float]
    saved: list[bool]
    E_smooth: list[float]
    bills_on_time: int
    bills_total: int
    bounces: int
    categorised_share: float
    cash_share: float
    as_of: Optional[date]
    week_starts: Optional[list[date]] = None   # None for score_from_weekly
    D_smooth: Optional[list[float]] = None
    late_by_category: Optional[list[dict]] = None        # [{category, times_late}] for recurring bill payees
    flex_weekly_by_category: Optional[dict[str, float]] = None  # flexible category -> average weekly spend (rupees)


def late_by_category(recurring: dict[str, list[Txn]]) -> list[dict]:
    """Late payments (same rule as bill_stats) grouped by bill category, most late first."""
    late: dict[str, int] = defaultdict(int)
    for payments in recurring.values():
        usual = float(np.median([p.date.day for p in payments]))
        n = sum(1 for p in payments if circular_day_diff(p.date.day, usual) > ON_TIME_DAYS)
        if n:
            late[payments[0].category] += n
    return [{"category": c, "times_late": n} for c, n in sorted(late.items(), key=lambda kv: (-kv[1], kv[0]))]


def flex_weekly_by_category(txns: list[Txn], window: list[date]) -> dict[str, float]:
    """Average weekly spend (rupees) per flexible expense category over the window."""
    if not window:
        return {}
    totals: dict[str, int] = defaultdict(int)
    for t in in_window(txns, window):
        if t.kind == "EXPENSE" and t.category not in FIXED_CATEGORIES:
            totals[t.category] += t.amount_paise
    return {c: v / 100 / len(window) for c, v in totals.items()}


def weekly_inputs(txns: list[Txn], as_of: Optional[date] = None) -> WeeklyInputs:
    as_of = as_of or (max(t.date for t in txns) if txns else None)
    window = select_window(txns, as_of)
    raw = weekly_features(txns, as_of, smooth=False)
    smooth = weekly_features(txns, as_of, smooth=True)
    recurring = detect_recurring_bills(txns, window)
    on_time, total, bounces = bill_stats(recurring, txns, window)

    scope = [t for t in in_window(txns, window) if t.kind != "IGNORED"]
    value = sum(t.amount_paise for t in scope)
    categorised = sum(t.amount_paise for t in scope if t.category != "OTHER")
    income_total = sum(t.amount_paise for t in scope if t.kind == "INCOME")
    cash = sum(t.amount_paise for t in scope if t.kind == "INCOME" and t.category == "CASH_DEPOSIT")

    return WeeklyInputs(I=[w.income for w in raw], E=[w.expense for w in raw], D=[w.debt for w in raw],
                        saved=[w.saved for w in raw], E_smooth=[w.expense for w in smooth],
                        bills_on_time=on_time, bills_total=total, bounces=bounces,
                        categorised_share=categorised / value if value else 0.0,
                        cash_share=cash / income_total if income_total else 0.0,
                        as_of=as_of, week_starts=[w.week_start for w in raw],
                        D_smooth=[w.debt for w in smooth],
                        late_by_category=late_by_category(recurring),
                        flex_weekly_by_category=flex_weekly_by_category(txns, window))
