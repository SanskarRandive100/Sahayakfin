"""The one ingest pipeline used by both /statements and /aa/fetch.
The file lives only in memory: parse → normalise (mask + categorise) → encrypt + store → rescore."""
import logging
import time

from sqlalchemy.orm import Session

from app import ingest
from app.config import settings
from app.errors import AppError
from app.models import Consent, User
from app.services.audit import audit
from app.services.scoring_service import rescore
from app.services.txn_store import save_txns

log = logging.getLogger("sahayakfin")


def user_consent(db: Session, user: User, consent_id: str | None) -> Consent:
    """The consent must exist, belong to the user and be ACTIVE."""
    c = db.get(Consent, consent_id) if consent_id else None
    if c is None or c.user_id != user.id:
        raise AppError("CONSENT_REQUIRED")
    if c.status != "ACTIVE":
        raise AppError("CONSENT_REVOKED")
    return c


def _ms(t0: float) -> int:
    return max(0, round((time.perf_counter() - t0) * 1000))


def run_pipeline(db: Session, user: User, consent: Consent, data: bytes, filename: str,
                 password: str | None, extra_read_ms: int = 0) -> dict:
    t0 = time.perf_counter()
    if extra_read_ms:
        time.sleep(extra_read_ms / 1000)
    try:
        parsed = ingest.parse_statement(data, filename, password)
    except ingest.IngestError:
        raise
    except Exception:  # a malformed file must never become a 500
        log.warning("parser failed on a %s file", filename.rsplit(".", 1)[-1])
        raise AppError("UNSUPPORTED_FILE")
    read_ms = _ms(t0)

    t1 = time.perf_counter()
    owner = user.display_name if user.display_name and user.display_name != "Guest" else None
    txns = ingest.normalize(parsed.raw, owner, settings.payee_hmac_key)
    norm_ms = _ms(t1)
    if not txns:
        raise AppError("NO_TRANSACTIONS")

    src = save_txns(db, user.id, consent.id, parsed.kind, data, parsed.period_from, parsed.period_to, txns)
    audit(db, user, "STATEMENT_UPLOADED", user.id)

    t2 = time.perf_counter()
    score = rescore(db, user)
    score_ms = _ms(t2)
    db.commit()

    mask_ms = round(norm_ms * 0.4)
    return {
        "source_id": src.id,
        "kind": parsed.kind,
        "period": {"from": parsed.period_from.isoformat() if parsed.period_from else None,
                   "to": parsed.period_to.isoformat() if parsed.period_to else None},
        "weeks_covered": score.get("weeks_observed", src.weeks_covered),
        "txn_count": len(txns),
        "warnings": list(parsed.warnings or []),
        "stages": [{"code": "READ", "ms": read_ms}, {"code": "MASK", "ms": mask_ms},
                   {"code": "CATEGORISE", "ms": norm_ms - mask_ms}, {"code": "SCORE", "ms": score_ms}],
        "score": score,
    }
