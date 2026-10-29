"""PDF statements: decrypt in memory with pikepdf, read tables with pdfplumber. Never touches disk.

Layouts (detected from the header row):
- DEMO_BANK: Date | Narration | Ref No | Debit | Credit | Balance   (DD-MM-YYYY)
- ALT_BANK:  Txn Date | Value Date | Description | Withdrawal | Deposit | Balance   (DD/MM/YY)
"""
from io import BytesIO
from typing import Optional

import pdfplumber
import pikepdf

from app.ingest.amounts import parse_amount, parse_date
from app.ingest.errors import IngestError
from app.scoring.types import RawTxn

MAX_PAGES = 20

# column role -> header labels (lowercase) that identify it
HEADER_ALIASES = {
    "date": ("date", "txn date", "transaction date", "tran date"),
    "narration": ("narration", "description", "particulars", "details", "remarks"),
    "ref": ("ref no", "ref no.", "chq/ref no", "reference", "ref", "cheque no"),
    "debit": ("debit", "withdrawal", "withdrawals", "withdrawal amt", "dr"),
    "credit": ("credit", "deposit", "deposits", "deposit amt", "cr"),
    "balance": ("balance", "closing balance", "running balance"),
}


def _clean(cell) -> str:
    return " ".join(str(cell).split()) if cell is not None else ""


def header_map(row: list) -> Optional[dict[str, int]]:
    """Column index per role if this row is a statement header, else None."""
    labels = [_clean(c).lower() for c in row]
    found: dict[str, int] = {}
    for role, aliases in HEADER_ALIASES.items():
        for i, label in enumerate(labels):
            if label in aliases and i not in found.values():
                found[role] = i
                break
    if {"date", "narration", "debit", "credit"} <= found.keys():
        return found
    return None


def layout_of(cols: dict[str, int], row: list) -> str:
    labels = [_clean(c).lower() for c in row]
    return "ALT_BANK" if "value date" in labels or "withdrawal" in labels else "DEMO_BANK"


def decrypt(data: bytes, password: Optional[str]) -> BytesIO:
    try:
        pdf = pikepdf.open(BytesIO(data), password=password or "")
    except pikepdf.PasswordError:
        raise IngestError("PDF_PASSWORD_WRONG" if password else "PDF_PASSWORD_REQUIRED")
    except Exception:
        raise IngestError("UNSUPPORTED_FILE")
    with pdf:
        if len(pdf.pages) > MAX_PAGES:
            raise IngestError("TOO_MANY_PAGES")
        out = BytesIO()
        pdf.save(out)  # saving without encryption= drops the password; stays in memory
    out.seek(0)
    return out


def parse_pdf(data: bytes, password: Optional[str] = None) -> tuple[list[RawTxn], str, list[str]]:
    buf = decrypt(data, password)
    raw: list[RawTxn] = []
    warnings: list[str] = []
    cols: Optional[dict[str, int]] = None
    layout = "DEMO_BANK"
    last: Optional[RawTxn] = None
    try:
        doc = pdfplumber.open(buf)
    except Exception:
        raise IngestError("UNSUPPORTED_FILE")
    with doc:
        for page_no, page in enumerate(doc.pages, start=1):
            tables = page.extract_tables() or []
            if not tables:
                table = page.extract_table({"vertical_strategy": "lines", "horizontal_strategy": "lines"})
                tables = [table] if table else []
            if not tables:
                warnings.append(f"Page {page_no} has no table.")
                continue
            for table in tables:
                for row in table:
                    if not row:
                        continue
                    hm = header_map(row)
                    if hm:
                        cols, layout = hm, layout_of(hm, row)
                        continue
                    if cols is None:
                        continue
                    cell = lambda role: _clean(row[cols[role]]) if role in cols and cols[role] < len(row) else ""  # noqa: E731
                    d = parse_date(cell("date"))
                    narration = cell("narration")
                    if d is None:
                        if narration and last is not None and not cell("debit") and not cell("credit"):
                            last.narration = f"{last.narration} {narration}"  # wrapped narration line
                        continue
                    debit = parse_amount(cell("debit")) or 0.0
                    credit = parse_amount(cell("credit")) or 0.0
                    balance = parse_amount(cell("balance"))
                    ref = cell("ref") or None
                    if debit > 0:
                        last = RawTxn(d, narration, debit, "DR", balance, ref)
                    elif credit > 0:
                        last = RawTxn(d, narration, credit, "CR", balance, ref)
                    else:
                        continue
                    raw.append(last)
    return raw, layout, warnings
