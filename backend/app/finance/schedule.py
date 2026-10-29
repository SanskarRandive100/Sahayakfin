"""Weekly repayment schedule on the borrower's payout weekday (CONTRACTS §4.1)."""
from datetime import date, timedelta

from app.finance.kfs import kfs

WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]


def first_due_date(start: date, payout_weekday: str) -> date:
    """First payout weekday on or after start + 7 days."""
    target = WEEKDAYS.index(payout_weekday.strip().upper()[:3])
    earliest = start + timedelta(days=7)
    return earliest + timedelta(days=(target - earliest.weekday()) % 7)


def schedule(principal_paise: int, rate_pct: float, weeks: int, start: date, payout_weekday: str) -> list[dict]:
    """[{seq, due_date (datetime.date), amount_paise}]; the last row absorbs rounding so rows sum to the KFS total."""
    k = kfs(principal_paise, rate_pct, 0, weeks)
    n = k["n_instalments"]
    first = first_due_date(start, payout_weekday)
    rows = [{"seq": i + 1, "due_date": first + timedelta(days=7 * i), "amount_paise": k["instalment_paise"]}
            for i in range(n)]
    if rows:
        rows[-1]["amount_paise"] = k["total_repayable_paise"] - k["instalment_paise"] * (n - 1)
    return rows
