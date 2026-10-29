from datetime import timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.errors import AppError
from app.models import Consent, User, aware
from app.schemas import ConsentIn
from app.security.deps import current_user
from app.services import clock
from app.services.audit import audit
from app.services.consent_sweep import delete_consent_data

router = APIRouter(prefix="/consents", tags=["consents"])


def consent_out(c: Consent) -> dict:
    return {"id": c.id, "purpose": c.purpose, "fi_types": c.fi_types, "range_from": c.range_from.isoformat(),
            "range_to": c.range_to.isoformat(), "data_life_days": c.data_life_days, "fetch_type": c.fetch_type,
            "status": c.status, "created_at": aware(c.created_at).isoformat(),
            "expires_at": aware(c.expires_at).isoformat(),
            "revoked_at": aware(c.revoked_at).isoformat() if c.revoked_at else None}


def get_own_consent(db: Session, user: User, consent_id: str) -> Consent:
    c = db.get(Consent, consent_id)
    if c is None or c.user_id != user.id:
        raise AppError("NOT_FOUND", 404)
    return c


def create_consent(db: Session, user: User, body: ConsentIn) -> Consent:
    now, today = clock.now(), clock.today()
    c = Consent(user_id=user.id, purpose=body.purpose, fi_types=list(body.fi_types),
                range_from=today - timedelta(days=body.range_days), range_to=today,
                data_life_days=body.data_life_days, fetch_type=body.fetch_type, status="ACTIVE",
                created_at=now, expires_at=now + timedelta(days=body.data_life_days))
    db.add(c)
    db.flush()
    audit(db, user, "CONSENT_CREATED", user.id)
    return c


@router.post("")
def post_consent(body: ConsentIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = create_consent(db, user, body)
    db.commit()
    return consent_out(c)


@router.get("")
def list_consents(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(Consent).filter(Consent.user_id == user.id).order_by(Consent.created_at.desc()).all()
    return [consent_out(c) for c in rows]


@router.post("/{consent_id}/revoke")
def revoke(consent_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = get_own_consent(db, user, consent_id)
    deleted = delete_consent_data(db, c)
    if c.status == "ACTIVE":
        c.status = "REVOKED"
        c.revoked_at = clock.now()
        audit(db, user, "CONSENT_REVOKED", user.id)
    db.commit()
    return {"consent": consent_out(c), "deleted": deleted}
