"""Demo-only helpers: simulated clock, per-user reset, and the synthetic sample files."""
from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.errors import AppError
from app.models import Consent, Goal, LenderShare, Loan, Offer, ScoreRun, User
from app.schemas import AdvanceClockIn
from app.security.deps import current_user
from app.services import clock

router = APIRouter(prefix="/demo", tags=["demo"])

PERSONAS = ("ravi", "sunita", "arjun", "meena")


def _demo_only():
    if not settings.demo_mode:
        raise AppError("NOT_FOUND", 404)


def reset_user_data(db: Session, user_id: str) -> None:
    db.query(LenderShare).filter(LenderShare.user_id == user_id).delete(synchronize_session=False)
    for loan in db.query(Loan).filter(Loan.user_id == user_id):
        db.delete(loan)  # cascades to repayments and reminders
    db.flush()
    db.query(Offer).filter(Offer.user_id == user_id).delete(synchronize_session=False)
    db.query(ScoreRun).filter(ScoreRun.user_id == user_id).delete(synchronize_session=False)
    db.query(Goal).filter(Goal.user_id == user_id).delete(synchronize_session=False)
    for c in db.query(Consent).filter(Consent.user_id == user_id):
        db.delete(c)  # cascades to data_sources and transactions


@router.post("/advance-clock")
def advance_clock(body: AdvanceClockIn, _: User = Depends(current_user)):
    _demo_only()
    return {"now": clock.advance(body.days).astimezone(clock.IST).isoformat()}


@router.post("/reset")
def reset(user: User = Depends(current_user), db: Session = Depends(get_db)):
    _demo_only()
    reset_user_data(db, user.id)
    db.commit()
    clock.reset()
    return {"ok": True}


@router.get("/samples/{name}")
def sample(name: str):
    persona, _, ext = name.partition(".")
    if persona not in PERSONAS or ext not in ("pdf", "csv", "locked.pdf"):
        raise AppError("UNKNOWN_PERSONA", 404)
    path = settings.samples_dir / f"{persona}.{ext}"
    if not path.is_file():
        raise AppError("NOT_FOUND", 404, "Sample file is not generated yet.")
    media = "application/pdf" if ext.endswith("pdf") else "text/csv"
    return FileResponse(path, media_type=media, filename=path.name)
