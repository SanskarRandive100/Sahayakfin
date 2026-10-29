"""Repayment status and reminders, all driven by the simulated clock."""
from datetime import date, datetime, time, timedelta

from sqlalchemy.orm import Session

from app.models import Lender, Loan, Offer, Product, Reminder, Repayment, aware
from app.services import clock

# (code, days relative to the due date). Sent at 10:00 IST, inside the 09:00–18:00 window.
SCHEDULE = [("REMINDER_T_MINUS_2", -2), ("REMINDER_DUE_TODAY", 0),
            ("REMINDER_OVERDUE_1", 1), ("REMINDER_OVERDUE_7", 7)]
SEND_TIME = time(10, 0)


def repayment_status(rep: Repayment, today: date | None = None) -> str:
    today = today or clock.today()
    if rep.paid_at is not None or rep.status == "PAID":
        return "PAID"
    if rep.due_date == today:
        return "DUE"
    if rep.due_date < today:
        return "OVERDUE"
    return "UPCOMING"


def repayment_out(rep: Repayment, today: date | None = None) -> dict:
    return {"id": rep.id, "loan_id": rep.loan_id, "seq": rep.seq, "due_date": rep.due_date.isoformat(),
            "amount_paise": rep.amount_paise, "status": repayment_status(rep, today),
            "paid_at": aware(rep.paid_at).isoformat() if rep.paid_at else None}


def lender_name_for_loan(db: Session, loan: Loan) -> str:
    offer = db.get(Offer, loan.offer_id)
    product = db.get(Product, offer.product_id) if offer else None
    lender = db.get(Lender, product.lender_id) if product and product.lender_id else None
    return lender.name if lender else ""


def refresh_reminders(db: Session, user_id: str) -> None:
    """Idempotently creates up to 4 reminders per unpaid repayment and marks the due ones as sent."""
    now = clock.now()
    for loan in db.query(Loan).filter(Loan.user_id == user_id):
        lender = lender_name_for_loan(db, loan)
        for rep in loan.repayments:
            existing = {r.code: r for r in rep.reminders}
            paid = rep.paid_at is not None
            for code, delta in SCHEDULE:
                send_at = datetime.combine(rep.due_date + timedelta(days=delta), SEND_TIME, tzinfo=clock.IST)
                row = existing.get(code)
                if row is None:
                    if paid:
                        continue
                    row = Reminder(repayment_id=rep.id, code=code, send_at=send_at, sent=False,
                                   params={"amount_paise": rep.amount_paise,
                                           "due_date": rep.due_date.isoformat(), "lender": lender})
                    db.add(row)
                    rep.reminders.append(row)
                # Overdue reminders stop once the repayment is paid.
                if not row.sent and not paid and aware(row.send_at) <= now:
                    row.sent = True
    db.flush()


def loan_out(db: Session, loan: Loan) -> dict:
    today = clock.today()
    offer = db.get(Offer, loan.offer_id)
    product = db.get(Product, offer.product_id) if offer else None
    lender = db.get(Lender, product.lender_id) if product and product.lender_id else None
    sched = [repayment_out(r, today) for r in loan.repayments]
    return {
        "id": loan.id, "offer_id": loan.offer_id,
        "lender": {"id": lender.id, "name": lender.name} if lender else None,
        "product_id": product.id if product else None,
        "principal_paise": loan.principal_paise, "instalment_paise": loan.instalment_paise,
        "weeks": loan.weeks, "start_date": loan.start_date.isoformat(), "payout_weekday": loan.payout_weekday,
        "kfs": offer.kfs if offer else None,
        "paid_count": sum(1 for r in sched if r["status"] == "PAID"),
        "schedule": sched,
    }
