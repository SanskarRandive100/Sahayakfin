"""STUB (1.1): category OTHER, kind from direction."""
import uuid

from app.scoring.types import RawTxn, Txn


def normalize(raw: list[RawTxn], owner_name: str | None, hmac_key: bytes) -> list[Txn]:
    return [Txn(id=uuid.uuid4().hex, date=r.date, amount_paise=round(r.amount * 100), direction=r.direction,
                narration_masked="XXXX", payee_token=None, channel="OTHER", category="OTHER",
                kind="INCOME" if r.direction == "CR" else "EXPENSE",
                balance_paise=None if r.balance is None else round(r.balance * 100))
            for r in raw]


def recategorize(txn: Txn, category: str) -> Txn:
    txn.category = category
    txn.user_corrected = True
    return txn
