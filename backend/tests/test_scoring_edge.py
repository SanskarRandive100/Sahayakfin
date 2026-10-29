"""Edge cases on hand-built transactions (tasks/02 §2.7)."""
import uuid
from datetime import date, timedelta

from app.scoring import affordability, compute_score, nudges, stress_test, weekly_breakdown
from app.scoring.types import Txn
from app.scoring.weekly import select_window, weekly_features

MON = date(2026, 8, 3)  # a Monday


def txn(d, paise, direction="DR", category="FOOD", kind="EXPENSE", token=None, balance=None, flags=None):
    return Txn(id=uuid.uuid4().hex, date=d, amount_paise=paise, direction=direction, narration_masked="X",
               payee_token=token, channel="UPI", category=category, kind=kind, balance_paise=balance,
               flags=flags or [])


def steady(weeks=12, income=500000, spend=400000, start=MON, cash=False, extra=None):
    """Income every Monday, spending every Sunday (so every week is complete), rent every 4 weeks."""
    out = []
    for w in range(weeks):
        d = start + timedelta(weeks=w)
        cat = "CASH_DEPOSIT" if cash else "PLATFORM_PAYOUT"
        out.append(txn(d, income, "CR", cat, "INCOME"))
        out.append(txn(d + timedelta(days=6), spend, "DR", "FOOD", "EXPENSE"))
        if w % 4 == 0:
            out.append(txn(d + timedelta(days=1), 300000, "DR", "RENT", "EXPENSE", token="P-LANDLORD"))
    return out + (extra or [])


def test_window_last_12_complete_weeks():
    t = steady(weeks=14) + [txn(MON + timedelta(weeks=14, days=2), 100)]  # a partial 15th week
    w = select_window(t)
    assert len(w) == 12 and all(m.weekday() == 0 for m in w)
    assert w[-1] == MON + timedelta(weeks=13)


def test_first_partial_week_excluded():
    t = steady(weeks=5, start=MON) + [txn(MON - timedelta(days=2), 100)]  # starts on a Saturday
    assert select_window(t)[0] == MON


def test_short_statement_has_no_score():
    s = compute_score(steady(weeks=3))
    assert s["score"] is None and s["band"] is None and s["confidence"] == "NONE"
    assert [r["code"] for r in s["reasons"]] == ["THIN_FILE"]
    assert s["tips"] == [{"code": "ADD_MORE_HISTORY", "points": 0, "params": {"weeks_needed": 9}}]


def test_empty_statement():
    s = compute_score([])
    assert s["score"] is None and s["confidence"] == "NONE" and s["weeks_observed"] == 0
    assert affordability([])["safe_weekly_paise"] == 0
    assert stress_test([], 0.2, 1000)["light"] == "RED"
    assert weekly_breakdown([]) == {"weeks": [], "avg4_by_category": {}}
    assert nudges([], date(2026, 10, 25), None) == []


def test_zero_income_week_still_scored():
    no_pay = MON + timedelta(weeks=5)
    t = [x for x in steady(weeks=12) if not (x.kind == "INCOME" and x.date == no_pay)]
    s = compute_score(t)
    assert s["score"] is not None
    assert s["components"]["income_stability"]["available"] is True
    weeks = weekly_features(t)
    assert len(weeks) == 12 and weeks[5].income == 0
    total_i = sum(w.income for w in weeks)
    total_e = sum(w.expense for w in weeks)
    assert s["metrics"]["expense_ratio"] == round(total_e / total_i, 4)  # R uses totals


def test_cash_heavy_income_downgrades_confidence():
    assert compute_score(steady(weeks=12))["confidence"] == "HIGH"
    assert compute_score(steady(weeks=12, cash=True))["confidence"] == "MEDIUM"


def test_medium_confidence_with_9_weeks():
    assert compute_score(steady(weeks=9))["confidence"] == "MEDIUM"


def test_uncategorised_spending_lowers_confidence_not_score():
    t = steady(weeks=12)
    other = [txn(x.date, x.amount_paise, x.direction, "OTHER", x.kind, x.payee_token) if x.category == "FOOD"
             else x for x in t]
    a, b = compute_score(t), compute_score(other)
    assert a["confidence"] == "HIGH" and b["confidence"] == "MEDIUM"
    assert a["score"] == b["score"]


def test_ignored_transactions_do_nothing():
    base = compute_score(steady(weeks=12))
    noisy = steady(weeks=12, extra=[
        txn(MON + timedelta(days=2), 900000, "CR", "SELF_TRANSFER", "IGNORED"),
        txn(MON + timedelta(days=3), 500000, "DR", "OTHER", "IGNORED", flags=["ROUND_TRIP"]),
    ])
    assert compute_score(noisy) == base


def test_savings_by_balance_growth():
    t = []
    bal = 100000
    for w in range(12):
        d = MON + timedelta(weeks=w)
        bal += 500000
        t.append(txn(d, 500000, "CR", "PLATFORM_PAYOUT", "INCOME", balance=bal))
        spend = 495000 if w % 2 else 400000   # odd weeks: grows ₹50 (< ₹100 threshold)
        bal -= spend
        t.append(txn(d + timedelta(days=6), spend, "DR", "FOOD", "EXPENSE", balance=bal))
    weeks = weekly_features(t)
    assert [w.saved for w in weeks] == [w % 2 == 0 for w in range(12)]


def test_bounce_penalty_and_floor():
    t = steady(weeks=12, extra=[txn(MON + timedelta(weeks=k, days=2), 59000, "DR", "FEES_CHARGES", "EXPENSE",
                                    flags=["BOUNCE"]) for k in range(5)])
    s = compute_score(t)
    assert s["metrics"]["bounces"] == 5
    assert s["components"]["bill_discipline"]["value"] == 0   # floored, never negative
    assert s["reasons"][0]["code"] == "BILL_BOUNCE" or "BILL_BOUNCE" in [r["code"] for r in s["reasons"]]


def test_late_bill_detected_with_month_wrap():
    rent_days = [date(2026, 8, 31), date(2026, 9, 29), date(2026, 10, 2)]   # around month end: all on time
    t = steady(weeks=12)
    t = [x for x in t if x.category != "RENT"] + [txn(d, 300000, "DR", "RENT", "EXPENSE", token="P-L")
                                                  for d in rent_days]
    s = compute_score(t)
    assert s["metrics"]["bills_total"] == 3 and s["metrics"]["bills_on_time"] == 3


def test_smoothing_spreads_rent_across_weeks():
    t = steady(weeks=12)
    raw = weekly_features(t)
    smooth = weekly_features(t, smooth=True)
    assert max(w.expense for w in raw) > max(w.expense for w in smooth)
    assert abs(sum(w.expense for w in raw) - sum(w.expense for w in smooth)) < 0.01
    assert len({round(w.expense, 2) for w in smooth}) == 1
