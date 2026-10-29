"""Store normalised transactions (narration encrypted) and load them back for scoring."""
import hashlib
from collections import Counter
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models import Consent, DataSource, Transaction, aware
from app.scoring.types import Txn
from app.security.crypto import decrypt, encrypt


def complete_weeks(period_from: date | None, period_to: date | None) -> int:
    """Number of complete Monday–Sunday weeks inside [period_from, period_to]."""
    if not period_from or not period_to or period_to < period_from:
        return 0
    first_monday = period_from + timedelta(days=(7 - period_from.weekday()) % 7)
    last_sunday = period_to - timedelta(days=(period_to.weekday() + 1) % 7)
    if last_sunday < first_monday:
        return 0
    return ((last_sunday - first_monday).days + 1) // 7


def save_txns(db: Session, user_id: str, consent_id: str, kind: str, data: bytes,
              period_from: date | None, period_to: date | None, txns: list[Txn]) -> DataSource:
    src = DataSource(user_id=user_id, consent_id=consent_id, kind=kind,
                     file_sha256=hashlib.sha256(data).hexdigest(),
                     period_from=period_from, period_to=period_to,
                     weeks_covered=complete_weeks(period_from, period_to))
    db.add(src)
    db.flush()
    db.add_all(Transaction(
        id=t.id, source_id=src.id, user_id=user_id, txn_date=t.date, amount_paise=int(t.amount_paise),
        direction=t.direction, narration_enc=encrypt(t.narration_masked), payee_token=t.payee_token,
        channel=t.channel, category=t.category, kind=t.kind,
        balance_paise=None if t.balance_paise is None else int(t.balance_paise),
        flags=list(t.flags or []), user_corrected=bool(t.user_corrected)) for t in txns)
    db.flush()
    return src


def to_txn(row: Transaction) -> Txn:
    return Txn(id=row.id, date=row.txn_date, amount_paise=row.amount_paise, direction=row.direction,
               narration_masked=decrypt(row.narration_enc), payee_token=row.payee_token, channel=row.channel,
               category=row.category, kind=row.kind, balance_paise=row.balance_paise,
               flags=list(row.flags or []), user_corrected=row.user_corrected)


def active_rows(db: Session, user_id: str):
    """Query of the user's transactions that belong to an ACTIVE consent."""
    return (db.query(Transaction).join(DataSource, Transaction.source_id == DataSource.id)
            .join(Consent, DataSource.consent_id == Consent.id)
            .filter(Transaction.user_id == user_id, Consent.status == "ACTIVE")
            .order_by(Transaction.txn_date, Transaction.id))


def dedupe_rows(rows: list[Transaction]) -> list[Transaction]:
    """The same statement uploaded twice (or CSV + PDF of the same account) must not double-count.
    Rows inside one source are always kept; a row from an older source is dropped when a newer source
    already has as many rows with the same (date, amount, direction, balance)."""
    by_source: dict[str, list[Transaction]] = {}
    for row in rows:
        by_source.setdefault(row.source_id, []).append(row)
    newest_first = sorted(by_source.values(), key=lambda rs: aware(rs[0].source.created_at), reverse=True)
    taken: Counter = Counter()
    out: list[Transaction] = []
    for source_rows in newest_first:
        here: Counter = Counter()
        for row in source_rows:
            key = (row.txn_date, row.amount_paise, row.direction, row.balance_paise)
            here[key] += 1
            if here[key] > taken[key]:
                out.append(row)
        taken |= here
    return sorted(out, key=lambda r: (r.txn_date, r.id))


def load_txns(db: Session, user_id: str) -> list[Txn]:
    """Transactions from ACTIVE consents only, narration decrypted."""
    return [to_txn(r) for r in dedupe_rows(active_rows(db, user_id).all())]


def txn_out(row: Transaction) -> dict:
    """TxnOut (CONTRACTS §5): never includes payee_token or the balance."""
    return {"id": row.id, "date": row.txn_date.isoformat(), "amount_paise": row.amount_paise,
            "direction": row.direction, "narration_masked": decrypt(row.narration_enc),
            "category": row.category, "kind": row.kind, "flags": list(row.flags or []),
            "user_corrected": row.user_corrected}
