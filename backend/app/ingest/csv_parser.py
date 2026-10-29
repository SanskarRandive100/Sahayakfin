"""CSV statements: validated header and tolerant row parsing (CONTRACTS section 2.5)."""
import csv
import io

from app.ingest.amounts import parse_amount, parse_date
from app.ingest.errors import IngestError
from app.scoring.types import RawTxn

REQUIRED_COLUMNS = {"date", "narration", "debit", "credit", "balance"}
EMPTY_AMOUNTS = {"", "-", "--", "NONE", "NULL"}


def parse_csv(text: str) -> tuple[list[RawTxn], list[str]]:
    raw: list[RawTxn] = []
    warnings: list[str] = []
    reader = csv.DictReader(io.StringIO(text), strict=True)
    try:
        fields = reader.fieldnames
    except csv.Error:
        raise IngestError("UNSUPPORTED_FILE") from None
    if fields is None:
        return raw, warnings
    fields = [(f or "").strip().lower() for f in fields]
    if not REQUIRED_COLUMNS <= set(fields) or len(set(fields)) != len(fields):
        raise IngestError("UNSUPPORTED_FILE")
    reader.fieldnames = fields
    try:
        for row in reader:
            # Extra cells (often an unquoted thousands separator) shift the financial columns.
            malformed = None in row or any(v is None for v in row.values())
            d = parse_date(row.get("date"))
            narration = " ".join((row.get("narration") or "").split())
            amounts = {key: parse_amount(row.get(key)) for key in ("debit", "credit", "balance")}
            malformed |= any(value is None and (row.get(key) or "").strip().upper() not in EMPTY_AMOUNTS
                             for key, value in amounts.items())
            debit = abs(amounts["debit"] or 0.0)
            credit = abs(amounts["credit"] or 0.0)
            if malformed or d is None or not narration or (debit > 0) == (credit > 0):
                warnings.append(f"Skipped CSV line {reader.line_num}: could not read it.")
                continue
            raw.append(RawTxn(d, narration, debit or credit, "DR" if debit else "CR", amounts["balance"]))
    except csv.Error:
        warnings.append(f"Skipped CSV line {reader.line_num}: could not read it.")
    return raw, warnings
