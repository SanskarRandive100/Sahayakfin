"""Insert-only audit diary: who looked at or changed whose data, and why."""
from sqlalchemy.orm import Session

from app.models import AuditLog, User
from app.services import clock

PURPOSES = {
    "CONSENT_CREATED": "loan assessment",
    "CONSENT_REVOKED": "consent withdrawn",
    "CONSENT_EXPIRED": "data life ended",
    "STATEMENT_UPLOADED": "loan assessment",
    "TXN_RECATEGORISED": "correction by you",
    "LOAN_ACCEPTED": "loan",
    "REPAYMENT_PAID": "loan repayment",
    "SHARED_WITH_LENDER": "loan application",
    "SHARE_REVOKED": "loan application",
    "VIEW_SCORE_SUMMARY": "loan application",
}


def audit(db: Session, actor: User | str | None, action: str, subject_user_id: str | None,
          purpose: str | None = None, actor_name: str | None = None) -> AuditLog:
    """actor is a User, or "SYSTEM". actor_name defaults to "You" for a user acting on their own data."""
    if actor is None or actor == "SYSTEM":
        role, actor_id, name = "SYSTEM", None, actor_name or "System"
    else:
        role, actor_id = actor.role, actor.id
        name = actor_name or ("You" if actor.id == subject_user_id else actor.display_name)
    row = AuditLog(ts=clock.now(), actor_role=role, actor_id=actor_id, actor_name=name,
                   subject_user_id=subject_user_id, action=action,
                   purpose=purpose or PURPOSES.get(action, ""))
    db.add(row)
    return row
