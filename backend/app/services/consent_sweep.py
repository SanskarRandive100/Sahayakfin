"""Revoke/expiry data deletion. Expired consents are swept on every authenticated request."""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Consent, DataSource, LenderShare, Transaction, aware
from app.services import clock
from app.services.audit import audit


def delete_consent_data(db: Session, consent: Consent) -> dict:
    """Deletes the consent's sources (cascade removes transactions) and ends its lender shares."""
    source_ids = [sid for (sid,) in db.query(DataSource.id).filter(DataSource.consent_id == consent.id)]
    n_txn = 0
    if source_ids:
        n_txn = db.scalar(select(func.count()).select_from(Transaction)
                          .where(Transaction.source_id.in_(source_ids))) or 0
        # Explicit child delete as well, so it also holds on a DB with foreign keys off.
        db.query(Transaction).filter(Transaction.source_id.in_(source_ids)).delete(synchronize_session=False)
        db.query(DataSource).filter(DataSource.id.in_(source_ids)).delete(synchronize_session=False)
    now = clock.now()
    for share in db.query(LenderShare).filter(LenderShare.user_id == consent.user_id,
                                              LenderShare.revoked_at.is_(None)):
        if share.consent_id in (consent.id, None):
            share.revoked_at = now
    return {"transactions": int(n_txn), "sources": len(source_ids)}


def sweep_expired(db: Session) -> int:
    now = clock.now()
    expired = [c for c in db.query(Consent).filter(Consent.status == "ACTIVE") if aware(c.expires_at) <= now]
    for c in expired:
        delete_consent_data(db, c)
        c.status = "EXPIRED"
        audit(db, "SYSTEM", "CONSENT_EXPIRED", c.user_id)
    if expired:
        db.commit()
    return len(expired)
