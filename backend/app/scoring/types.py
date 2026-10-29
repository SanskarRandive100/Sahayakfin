"""Shared data types (CONTRACTS §2.1). Amounts in RawTxn / WeekFeature are rupees; Txn uses paise."""
from dataclasses import dataclass, field
from datetime import date
from typing import Literal, Optional

Direction = Literal["CR", "DR"]


@dataclass
class RawTxn:                     # straight out of the parser, unmasked, lives in memory only
    date: date
    narration: str
    amount: float                 # rupees, always positive
    direction: Direction
    balance: Optional[float] = None
    ref: Optional[str] = None


@dataclass
class Txn:                        # normalised, masked; this is what gets stored and scored
    id: str                       # uuid4 hex
    date: date
    amount_paise: int             # positive
    direction: Direction
    narration_masked: str
    payee_token: Optional[str]    # HMAC token, e.g. "P-3F2A9C1E"; None when there is no payee
    channel: str                  # UPI | NEFT | IMPS | ATM | NACH | CASH | CARD | OTHER
    category: str                 # see CONTRACTS §2.2
    kind: str                     # see CONTRACTS §2.3
    balance_paise: Optional[int] = None
    flags: list[str] = field(default_factory=list)   # e.g. ["ROUND_TRIP"], ["BOUNCE"], ["CASH_INCOME"]
    user_corrected: bool = False


@dataclass
class WeekFeature:
    week_start: date
    income: float
    expense: float
    debt: float
    saved: bool
    expense_fixed: float
    expense_flex: float
    closing_balance: Optional[float]


@dataclass
class ParseResult:
    raw: list[RawTxn]
    kind: str                     # "PDF" | "CSV" | "AA"
    layout: str                   # "DEMO_BANK" | "ALT_BANK" | "CSV" | "AA"
    period_from: Optional[date]
    period_to: Optional[date]
    warnings: list[str] = field(default_factory=list)
