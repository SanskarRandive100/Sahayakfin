from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.errors import AppError
from app.models import Loan, Reminder, Repayment, User, aware
from app.security.deps import current_user
from app.services import clock
from app.services.audit import audit
from app.services.reminders import loan_out, refresh_reminders, repayment_out

router = APIRouter(tags=["loans"])


@router.get("/loans")
def list_loans(user: User = Depends(current_user), db: Session = Depends(get_db)):
    loans = db.query(Loan).filter(Loan.user_id == user.id).order_by(Loan.created_at.desc()).all()
    return [loan_out(db, l) for l in loans]


@router.post("/repayments/{repayment_id}/pay")
def pay(repayment_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    rep = db.get(Repayment, repayment_id)
    if rep is None or rep.loan.user_id != user.id:
        raise AppError("NOT_FOUND", 404)
    if rep.paid_at is not None:
        raise AppError("VALIDATION_ERROR", 422, "This instalment is already paid.")
    rep.status, rep.paid_at = "PAID", clock.now()
    audit(db, user, "REPAYMENT_PAID", user.id)
    db.commit()
    return repayment_out(rep)


@router.get("/reminders")
def reminders(user: User = Depends(current_user), db: Session = Depends(get_db)):
    refresh_reminders(db, user.id)
    db.commit()
    rows = (db.query(Reminder).join(Repayment, Reminder.repayment_id == Repayment.id)
            .join(Loan, Repayment.loan_id == Loan.id)
            .filter(Loan.user_id == user.id, Reminder.sent.is_(True))
            .order_by(Reminder.send_at, Repayment.seq).all())
    return [{"id": r.id, "repayment_id": r.repayment_id, "send_at": aware(r.send_at).isoformat(),
             "code": r.code, "params": r.params, "sent": r.sent} for r in rows]
