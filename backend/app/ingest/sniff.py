"""Detect the statement type from its bytes and dispatch to the right parser."""
import csv
import io
import json
from typing import Optional

from app.ingest.aa_parser import parse_aa
from app.ingest.csv_parser import parse_csv
from app.ingest.errors import IngestError
from app.ingest.pdf_parser import parse_pdf
from app.scoring.types import ParseResult


def decode_text(data: bytes) -> Optional[str]:
    for encoding in ("utf-8-sig", "latin-1"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return None


def sniff(data: bytes, filename: str = "") -> str:
    """'PDF' | 'CSV' | 'AA', else IngestError('UNSUPPORTED_FILE')."""
    if data.lstrip()[:5] == b"%PDF-":
        return "PDF"
    text = decode_text(data)
    if text is None or "\x00" in text:
        raise IngestError("UNSUPPORTED_FILE")
    try:
        header = next(csv.reader(io.StringIO(text), strict=True), [])
    except csv.Error:
        header = []
    if {"date", "narration"} <= {field.strip().lower() for field in header}:
        return "CSV"
    try:
        doc = json.loads(text)
    except ValueError:
        raise IngestError("UNSUPPORTED_FILE")
    if isinstance(doc, dict) and "transactions" in doc:
        return "AA"
    raise IngestError("UNSUPPORTED_FILE")


def parse_statement(data: bytes, filename: str, password: Optional[str] = None) -> ParseResult:
    kind = sniff(data, filename)
    if kind == "PDF":
        raw, layout, warnings = parse_pdf(data, password)
    elif kind == "CSV":
        raw, warnings = parse_csv(decode_text(data))
        layout = "CSV"
    else:
        raw, warnings = parse_aa(json.loads(decode_text(data)))
        layout = "AA"
    if not raw:
        raise IngestError("NO_TRANSACTIONS")
    dates = [r.date for r in raw]
    return ParseResult(raw=raw, kind=kind, layout=layout, period_from=min(dates), period_to=max(dates),
                       warnings=warnings)
