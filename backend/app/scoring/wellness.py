"""STUB (1.1)."""
from datetime import date


def weekly_breakdown(txns, weeks: int = 4) -> dict:
    rows = [{"week_start": f"2026-10-{d:02d}", "income_paise": 520000, "expense_paise": 430000,
             "by_category": {"FUEL": 100000, "FOOD": 90000, "RENT": 150000, "OTHER": 90000}}
            for d in (5, 12, 19)]
    return {"weeks": rows, "avg4_by_category": {"FUEL": 100000, "FOOD": 90000, "RENT": 150000, "OTHER": 90000}}


def nudges(txns, today: date, goal: dict | None) -> list[dict]:
    return [{"code": "PAYDAY_SAVE", "params": {"amount_paise": 500000, "suggest_paise": 10000}}]
