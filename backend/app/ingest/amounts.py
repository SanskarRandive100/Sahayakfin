"""Tolerant parsing of statement amounts and dates."""
import re
from datetime import date, datetime
from typing import Optional

DATE_FORMATS = ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%d/%m/%y", "%d-%m-%y", "%d %b %Y", "%d-%b-%Y", "%d-%b-%y")


def parse_amount(text) -> Optional[float]:
    """'1,234.50' / '₹1,234.50 Cr' / '(250.00)' / '-250' -> float; blank -> None. A 'Dr' suffix or brackets mean negative."""
    if text is None:
        return None
    if isinstance(text, (int, float)):
        return float(text)
    s = str(text).strip().upper().replace("₹", "").replace("INR", "").replace("RS.", "").replace(",", "")
    s = s.replace(" ", "")
    if s in ("", "-", "--", "NONE", "NULL"):
        return None
    negative = False
    if s.endswith("DR"):
        negative, s = True, s[:-2]
    elif s.endswith("CR"):
        s = s[:-2]
    if s.startswith("(") and s.endswith(")"):
        negative, s = True, s[1:-1]
    if not re.fullmatch(r"[+-]?\d+(\.\d+)?", s):
        return None
    value = float(s)
    return -value if negative else value


def parse_date(text, formats=DATE_FORMATS) -> Optional[date]:
    if text is None:
        return None
    s = " ".join(str(text).split())
    for fmt in formats:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None
