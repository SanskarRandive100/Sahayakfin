"""Ingest error with a stable UPPER_SNAKE code (CONTRACTS §5 upload codes)."""

_MESSAGES = {
    "UNSUPPORTED_FILE": "This file type is not supported. Upload a PDF or CSV bank statement.",
    "PDF_PASSWORD_REQUIRED": "This PDF is locked. Enter its password.",
    "PDF_PASSWORD_WRONG": "The PDF password is wrong.",
    "PDF_HAS_SCRIPT": "This PDF contains scripts and cannot be read safely.",
    "TOO_MANY_PAGES": "The statement has too many pages.",
    "NO_TRANSACTIONS": "No transactions were found in this statement.",
    "BAD_CATEGORY": "That category is not allowed.",
    "BAD_TIP": "Unknown tip code.",
}


class IngestError(Exception):
    def __init__(self, code: str, message: str | None = None):
        self.code = code
        self.message = message or _MESSAGES.get(code, code)
        super().__init__(f"{self.code}: {self.message}")
