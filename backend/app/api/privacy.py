from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.errors import AppError
from app.models import AuditLog, Lender, LenderShare, User, aware
from app.schemas import ShareIn
from app.security.deps import active_consent, current_user
from app.services import clock
from app.services.audit import audit

router = APIRouter(tags=["privacy"])


def share_out(s: LenderShare) -> dict:
    return {"id": s.id, "lender_id": s.lender_id, "created_at": aware(s.created_at).isoformat(),
            "revoked_at": aware(s.revoked_at).isoformat() if s.revoked_at else None}


@router.get("/audit")
def get_audit(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = (db.query(AuditLog).filter(AuditLog.subject_user_id == user.id)
            .order_by(AuditLog.ts.desc(), AuditLog.id).limit(50).all())
    return [{"ts": aware(r.ts).isoformat(), "actor_role": r.actor_role, "actor_name": r.actor_name,
             "action": r.action, "purpose": r.purpose} for r in rows]


@router.get("/lenders")
def lenders(user: User = Depends(current_user), db: Session = Depends(get_db)):
    shared = {s.lender_id: s.id for s in db.query(LenderShare)
              .filter(LenderShare.user_id == user.id, LenderShare.revoked_at.is_(None))}
    return [{"id": l.id, "name": l.name, "min_band": l.min_band, "share_id": shared.get(l.id)}
            for l in db.query(Lender).order_by(Lender.name)]


@router.get("/shares")
def list_shares(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(LenderShare).filter(LenderShare.user_id == user.id, LenderShare.revoked_at.is_(None)).all()
    return [share_out(s) for s in rows]


def share_with(db: Session, user: User, lender: Lender, consent_id: str) -> LenderShare:
    existing = (db.query(LenderShare).filter(LenderShare.user_id == user.id, LenderShare.lender_id == lender.id,
                                             LenderShare.revoked_at.is_(None)).first())
    if existing:
        return existing
    s = LenderShare(user_id=user.id, lender_id=lender.id, consent_id=consent_id, created_at=clock.now())
    db.add(s)
    db.flush()
    audit(db, user, "SHARED_WITH_LENDER", user.id, purpose=f"loan application · {lender.name}")
    return s


@router.post("/shares")
def create_share(body: ShareIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    lender = db.get(Lender, body.lender_id)
    if lender is None:
        raise AppError("NOT_FOUND", 404)
    consent = active_consent(db, user)
    if consent is None:
        raise AppError("CONSENT_REQUIRED")
    s = share_with(db, user, lender, consent.id)
    db.commit()
    return share_out(s)


@router.delete("/shares/{share_id}")
def delete_share(share_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = db.get(LenderShare, share_id)
    if s is None or s.user_id != user.id:
        raise AppError("NOT_FOUND", 404)
    if s.revoked_at is None:
        s.revoked_at = clock.now()
        lender = db.get(Lender, s.lender_id)
        audit(db, user, "SHARE_REVOKED", user.id, purpose=f"loan application · {lender.name if lender else ''}")
    db.commit()
    return share_out(s)
