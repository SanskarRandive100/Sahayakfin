"""Payee extraction, HMAC payee tokens and narration masking (CONTRACTS §2.4)."""
import hashlib
import hmac
import re
from typing import Optional

from app.ingest.categorize import is_business, owner_tokens

HANDLE_RE = re.compile(r"([A-Za-z0-9._\-]+)@([A-Za-z]+)")
PHONE_RE = re.compile(r"(?<!\d)[6-9]\d{9}(?!\d)")
DIGITS_RE = re.compile(r"(?<!\d)\d{9,18}(?!\d)")
LONG_DIGITS_RE = re.compile(r"\d{19,}")
SUFFIX_RE = re.compile(r"\b(PVT|PRIVATE|LTD|LIMITED|LLP|INC|CO)\b\.?")
SLASH_CHANNELS = ("UPI/", "IMPS/")


def normalise_name(name: str) -> str:
    """Uppercase, collapse spaces, strip company suffixes like PVT LTD."""
    s = re.sub(r"[^A-Z0-9& ]", " ", name.upper())
    s = SUFFIX_RE.sub(" ", s)
    return re.sub(r"\s+", " ", s).strip()


def extract_payee(narration: str) -> Optional[str]:
    """Raw payee/payer name as it appears in the narration, or None."""
    text = narration.strip()
    upper = text.upper()
    if upper.startswith(SLASH_CHANNELS):
        parts = text.split("/")
        if len(parts) > 3 and parts[3].strip():
            return parts[3].strip()
        return None
    if upper.startswith("NEFT"):
        m = re.search(r"CR-([^-]+)-", text, re.I) or re.search(r"(?:CR|DR)-([^-]+)$", text, re.I)
        return m.group(1).strip() if m else None
    m = re.search(r"ACH D-\s*(.+?)\s*(?:\bEMI\b|\bLN\b|$)", text, re.I)
    if m and m.group(1).strip():
        return m.group(1).strip()
    return None


def payee_token(name: Optional[str], key: bytes) -> Optional[str]:
    if not name:
        return None
    norm = normalise_name(name)
    if not norm:
        return None
    return "P-" + hmac.new(key, norm.encode(), hashlib.sha256).hexdigest()[:8].upper()


def _mask_handle(m: re.Match) -> str:
    return f"{m.group(1)[:2]}****@{m.group(2)}"


def mask_digits(text: str) -> str:
    text = PHONE_RE.sub(lambda m: "XXXXXX" + m.group(0)[-4:], text)
    text = DIGITS_RE.sub(lambda m: "XXXX" + m.group(0)[-4:], text)
    return LONG_DIGITS_RE.sub(lambda m: "XXXX" + m.group(0)[-4:], text)


def mask_narration(narration: str, payee_name: Optional[str], token: Optional[str],
                   owner_name: Optional[str] = None) -> str:
    """Hide handles, long numbers and person names; keep business names so the user recognises the row."""
    text = narration.strip()
    person = payee_name and not is_business(payee_name)
    if person and token:
        if text.upper().startswith(SLASH_CHANNELS):
            parts = text.split("/")
            parts[3] = token
            text = "/".join(parts)
        else:
            text = re.sub(re.escape(payee_name), token, text, flags=re.I)
    text = HANDLE_RE.sub(_mask_handle, text)
    for t in owner_tokens(owner_name):
        if len(t) >= 3:
            text = re.sub(rf"\b{re.escape(t)}\b", "XXXX", text, flags=re.I)
    return mask_digits(text)
