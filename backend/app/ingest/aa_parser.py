"""Mock Account Aggregator (FIP) JSON (CONTRACTS §2.5)."""
from app.ingest.amounts import parse_amount, parse_date
from app.scoring.types import RawTxn


def parse_aa(doc: dict) -> tuple[list[RawTxn], list[str]]:
    raw: list[RawTxn] = []
    warnings: list[str] = []
    for i, t in enumerate(doc.get("transactions") or []):
        if not isinstance(t, dict):
            warnings.append(f"Skipped AA transaction {i + 1}: not an object.")
            continue
        d = parse_date(t.get("valueDate"))
        amount = parse_amount(t.get("amount"))
        kind = str(t.get("type", "")).upper()
        narration = " ".join(str(t.get("narration") or "").split())
        if d is None or amount is None or amount == 0 or kind not in ("DEBIT", "CREDIT"):
            warnings.append(f"Skipped AA transaction {i + 1}: missing date, amount or type.")
            continue
        raw.append(RawTxn(date=d, narration=narration, amount=abs(amount),
                          direction="DR" if kind == "DEBIT" else "CR",
                          balance=parse_amount(t.get("currentBalance")), ref=t.get("txnId")))
    return raw, warnings
