"""Auth dependencies: current_user (Bearer JWT), require_role, require_active_consent."""
import jwt as pyjwt
from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.db import get_db
from app.errors import AppError
from app.models import Consent, User
from app.security.jwt import decode_token
from app.services.consent_sweep import sweep_expired


def current_user(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AppError("UNAUTHENTICATED", 401)
    try:
        claims = decode_token(authorization.split(" ", 1)[1].strip())
    except pyjwt.PyJWTError:
        raise AppError("UNAUTHENTICATED", 401)
    user = db.get(User, claims["sub"])
    # The role claim must match the DB, so a tampered or stale token can't escalate.
    if user is None or user.role != claims.get("role"):
        raise AppError("UNAUTHENTICATED", 401)
    sweep_expired(db)
    return user


def require_role(role: str):
    def _dep(user: User = Depends(current_user)) -> User:
        if user.role != role:
            raise AppError("FORBIDDEN", 403)
        return user
    return _dep


def active_consent(db: Session, user: User) -> Consent | None:
    return (db.query(Consent).filter(Consent.user_id == user.id, Consent.status == "ACTIVE")
            .order_by(Consent.created_at.desc()).first())


def require_active_consent(user: User = Depends(current_user), db: Session = Depends(get_db)) -> Consent:
    c = active_consent(db, user)
    if c is None:
        raise AppError("CONSENT_REQUIRED")
    return c
