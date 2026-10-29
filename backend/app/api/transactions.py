from datetime import timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import ingest
from app.db import get_db
from app.errors import AppError
from app.models import Transaction, User
from app.schemas import RecategoriseIn
from app.security.deps import current_user
from app.services.audit import audit
from app.services.scoring_service import rescore
from app.services.txn_store import active_rows, dedupe_rows, to_txn, txn_out

router = APIRouter(prefix="/transactions", tags=["transactions"])

CATEGORIES = {
    "PLATFORM_PAYOUT", "CUSTOMER_RECEIPT", "CASH_DEPOSIT", "OTHER_INCOME", "FUEL", "FOOD", "RENT", "BILLS",
    "PHONE", "TRANSPORT", "FAMILY", "HEALTH", "EDUCATION", "SHOPPING", "CASH_WITHDRAWAL", "EMI", "SAVINGS",
    "FEES_CHARGES", "SELF_TRANSFER", "OTHER",
}


@router.get("")
def list_transactions(weeks: int = Query(12, ge=1, le=52), user: User = Depends(current_user),
                      db: Session = Depends(get_db)):
    rows = dedupe_rows(active_rows(db, user.id).all())
    if not rows:
        return {"weeks": []}
    last = max(r.txn_date for r in rows)
    newest_monday = last - timedelta(days=last.weekday())
    oldest_monday = newest_monday - timedelta(weeks=weeks - 1)
    groups: dict = {}
    for r in rows:
        monday = r.txn_date - timedelta(days=r.txn_date.weekday())
        if monday < oldest_monday:
            continue
        g = groups.setdefault(monday, {"week_start": monday.isoformat(), "income_paise": 0,
                                       "expense_paise": 0, "txns": []})
        if r.kind == "INCOME":
            g["income_paise"] += r.amount_paise
        elif r.kind == "EXPENSE":
            g["expense_paise"] += r.amount_paise
        g["txns"].append(txn_out(r))
    out = []
    for monday in sorted(groups, reverse=True):
        g = groups[monday]
        g["txns"].sort(key=lambda t: (t["date"], t["id"]), reverse=True)
        out.append(g)
    return {"weeks": out}


@router.patch("/{txn_id}")
def recategorise(txn_id: str, body: RecategoriseIn, user: User = Depends(current_user),
                 db: Session = Depends(get_db)):
    row = db.get(Transaction, txn_id)
    if row is None or row.user_id != user.id:
        raise AppError("NOT_FOUND", 404)
    if body.category not in CATEGORIES:
        raise AppError("BAD_CATEGORY")
    t = ingest.recategorize(to_txn(row), body.category)
    row.category, row.kind, row.flags = t.category, t.kind, list(t.flags or [])
    row.user_corrected = True
    audit(db, user, "TXN_RECATEGORISED", user.id)
    db.flush()
    score = rescore(db, user)
    db.commit()
    return {"txn": txn_out(row), "score": score}
