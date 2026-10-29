"""STUB (1.1): 26 weekly rows."""
from datetime import date, timedelta


def schedule(principal_paise, rate_pct, weeks, start: date, payout_weekday: str) -> list[dict]:
    first = start + timedelta(days=7)
    return [{"seq": i + 1, "due_date": first + timedelta(days=7 * i), "amount_paise": 30678} for i in range(26)]
