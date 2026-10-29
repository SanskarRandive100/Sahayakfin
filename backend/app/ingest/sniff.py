"""STUB (1.1): returns 20 fake RawTxn over 3 weeks."""
from datetime import date, timedelta

from app.scoring.types import ParseResult, RawTxn


def parse_statement(data: bytes, filename: str, password: str | None = None) -> ParseResult:
    start = date(2026, 10, 5)
    raw = []
    for i in range(20):
        d = start + timedelta(days=i)
        if i % 7 == 4:
            raw.append(RawTxn(d, "NEFT CR-QUICKBITE TECHNOLOGIES PVT LTD-WEEKLY PAYOUT", 5000.0, "CR"))
        else:
            raw.append(RawTxn(d, "UPI/DR/123456789012/HP PETROL PUMP/hppay@icici/fuel", 150.0, "DR"))
    return ParseResult(raw=raw, kind="CSV", layout="DEMO_BANK", period_from=raw[0].date,
                       period_to=raw[-1].date, warnings=[])
