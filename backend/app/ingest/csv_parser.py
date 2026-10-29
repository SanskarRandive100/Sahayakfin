"""CSV statements: header date,narration,debit,credit,balance (CONTRACTS §2.5)."""
import csv
import io

from app.ingest.amounts import parse_amount, parse_date
from app.scoring.types import RawTxn


def parse_csv(text: str) -> tuple[list[RawTxn], list[str]]:
    raw: list[RawTxn] = []
    warnings: list[str] = []
    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        return raw, warnings
    reader.fieldnames = [(f or "").strip().lower() for f in reader.fieldnames]
    for line_no, row in enumerate(reader, start=2):
        d = parse_date(row.get("date"))
        narration = " ".join((row.get("narration") or "").split())
        # The column says which side it is; a "Dr"/"Cr" suffix or sign on these cells is only a label.
        debit = abs(parse_amount(row.get("debit")) or 0.0)
        credit = abs(parse_amount(row.get("credit")) or 0.0)
        if d is None or not narration or (debit == 0 and credit == 0):
            if any((v or "").strip() for v in row.values() if isinstance(v, str)):
                warnings.append(f"Skipped CSV line {line_no}: could not read it.")
            continue
        balance = parse_amount(row.get("balance"))
        if debit > 0:
            raw.append(RawTxn(d, narration, debit, "DR", balance))
        if credit > 0:
            raw.append(RawTxn(d, narration, credit, "CR", balance))
    return raw, warnings
