"""RawTxn -> Txn: categorise (raw text) -> flag -> mask -> token -> kind, then round-trip detection (CONTRACTS §2)."""
import math
import re
import secrets
import time
from collections import Counter
from dataclasses import replace
from typing import Optional

from app.ingest.categorize import (BOUNCE_RE, CATEGORIES, INCOME_CATEGORIES, REVERSAL_RE, categorize,
                                   is_business)
from app.ingest.errors import IngestError
from app.ingest.mask import extract_payee, mask_narration, payee_token
from app.scoring.types import RawTxn, Txn

ROUND_TRIP_DAYS = 7
ROUND_TRIP_TOLERANCE = 0.10
PINNED_FLAGS = {"ROUND_TRIP", "REVERSAL"}  # gaming defences a recategorisation cannot undo


def ordered_ids(n: int) -> list[str]:
    """32-hex ids that sort in statement order: batch prefix (time + random) + 6-hex sequence + random tail.
    Storage that orders rows by (date, id) then keeps the bank's order within a day, which the weekly
    closing balance (savings rule) depends on."""
    batch = f"{time.time_ns() // 1000:014x}"[-14:] + secrets.token_hex(1)
    return [f"{batch}{i:06x}{secrets.token_hex(5)}"[:32] for i in range(n)]


def to_paise(rupees: float) -> int:
    return math.floor(rupees * 100 + 0.5)


def channel_of(narration: str) -> str:
    u = narration.strip().upper()
    for prefix, channel in (("UPI", "UPI"), ("NEFT", "NEFT"), ("IMPS", "IMPS"), ("ATM", "ATM"),
                            ("NACH", "NACH"), ("ACH", "NACH"), ("ECS", "NACH"), ("POS", "CARD"), ("CARD", "CARD")):
        if u.startswith(prefix):
            return channel
    if re.search(r"\bATM\b|CASH WDL", u):
        return "ATM"
    if re.search(r"\bCASH\b", u):
        return "CASH"
    return "OTHER"


def kind_of(category: str, direction: str, flags: list[str] = ()) -> str:
    if PINNED_FLAGS & set(flags) or category == "SELF_TRANSFER":
        return "IGNORED"
    if direction == "CR":
        return "INCOME" if category in INCOME_CATEGORIES else "IGNORED"
    if category == "SAVINGS":
        return "SAVINGS"
    if category == "EMI":
        return "DEBT"
    return "EXPENSE"


def _flags_for(category: str, narration: str) -> list[str]:
    flags = []
    if BOUNCE_RE.search(narration):
        flags.append("BOUNCE")
    if category == "CASH_DEPOSIT":
        flags.append("CASH_INCOME")
    if REVERSAL_RE.search(narration):
        flags.append("REVERSAL")
    return flags


def _mark_round_trips(txns: list[Txn]) -> None:
    """A DR to payee X and a CR from X within 7 days, amounts within ±10%: both legs IGNORED (each CR used once)."""
    credits = [t for t in txns if t.direction == "CR" and t.payee_token and t.kind != "IGNORED"]
    used: set[str] = set()
    for dr in sorted((t for t in txns if t.direction == "DR" and t.payee_token and t.kind != "IGNORED"),
                     key=lambda t: t.date):
        best, best_gap = None, None
        for cr in credits:
            if cr.id in used or cr.payee_token != dr.payee_token:
                continue
            gap = abs((cr.date - dr.date).days)
            if gap > ROUND_TRIP_DAYS or abs(cr.amount_paise - dr.amount_paise) > ROUND_TRIP_TOLERANCE * dr.amount_paise:
                continue
            if best is None or gap < best_gap:
                best, best_gap = cr, gap
        if best is not None:
            used.add(best.id)
            for leg in (dr, best):
                leg.flags.append("ROUND_TRIP")
                leg.kind = "IGNORED"


def _mark_family(txns: list[Txn], person_tokens: set[str]) -> None:
    """Uncategorised UPI debits to the same person, repeated, are treated as money sent to family."""
    counts = Counter(t.payee_token for t in txns
                     if t.direction == "DR" and t.category == "OTHER" and t.payee_token in person_tokens)
    for t in txns:
        if t.direction == "DR" and t.category == "OTHER" and counts.get(t.payee_token, 0) >= 2 \
                and t.kind == "EXPENSE" and t.channel == "UPI":
            t.category = "FAMILY"


def normalize(raw: list[RawTxn], owner_name: Optional[str], hmac_key: bytes) -> list[Txn]:
    if isinstance(hmac_key, str):
        hmac_key = hmac_key.encode()
    out: list[Txn] = []
    person_tokens: set[str] = set()
    ids = ordered_ids(len(raw))
    for r, txn_id in zip(raw, ids):
        narration = " ".join(str(r.narration).split())
        name = extract_payee(narration)
        category = categorize(narration, r.direction, owner_name, name)
        flags = _flags_for(category, narration)
        token = payee_token(name, hmac_key)
        if token and not is_business(name):
            person_tokens.add(token)
        out.append(Txn(
            id=txn_id,
            date=r.date,
            amount_paise=to_paise(abs(r.amount)),
            direction=r.direction,
            narration_masked=mask_narration(narration, name, token, owner_name),
            payee_token=token,
            channel=channel_of(narration),
            category=category,
            kind=kind_of(category, r.direction, flags),
            balance_paise=None if r.balance is None else to_paise(r.balance),
            flags=flags,
        ))
    _mark_family(out, person_tokens)
    _mark_round_trips(out)
    return out


def recategorize(txn: Txn, category: str) -> Txn:
    """User correction: new category, kind recomputed, user_corrected=True. Round trips/reversals stay ignored."""
    if category not in CATEGORIES:
        raise IngestError("BAD_CATEGORY")
    flags = [f for f in txn.flags if f != "CASH_INCOME"]
    if category == "CASH_DEPOSIT" and txn.direction == "CR":
        flags.append("CASH_INCOME")
    return replace(txn, category=category, kind=kind_of(category, txn.direction, flags), flags=flags,
                   user_corrected=True)
