"""First line of defence for uploads: size, signature, dangerous PDF features, page count."""
import re

from app.errors import AppError

MAX_BYTES = 5 * 1024 * 1024
MAX_PAGES = 20

# A PDF name must be followed by a delimiter, so random bytes inside compressed streams rarely match.
_PDF_DANGER_RE = re.compile(rb"/(JavaScript|JS|EmbeddedFiles?|Launch)(?=[\s/<>\[\]()])")
_PAGE_RE = re.compile(rb"/Type\s*/Page(?!s)")


def validate_upload(data: bytes, filename: str) -> str:
    """Returns "PDF" or "CSV"; raises AppError with a CONTRACTS §5 upload code."""
    if len(data) > MAX_BYTES:
        raise AppError("FILE_TOO_LARGE", 413)
    if not data:
        raise AppError("UNSUPPORTED_FILE")
    name = (filename or "").lower()
    ext = name.rsplit(".", 1)[-1] if "." in name else ""

    if data.lstrip()[:5] == b"%PDF-":
        if ext not in ("pdf", ""):
            raise AppError("UNSUPPORTED_FILE")
        if _PDF_DANGER_RE.search(data):
            raise AppError("PDF_HAS_SCRIPT")
        # Encrypted PDFs hide their objects, so this count is approximate; the parser checks again.
        if len(_PAGE_RE.findall(data)) > MAX_PAGES:
            raise AppError("TOO_MANY_PAGES")
        return "PDF"

    if ext == "pdf":
        raise AppError("UNSUPPORTED_FILE")  # a ".pdf" that isn't a PDF
    try:
        text = data.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise AppError("UNSUPPORTED_FILE")
    if "\x00" in text or "," not in text.split("\n", 1)[0]:
        raise AppError("UNSUPPORTED_FILE")
    if ext not in ("csv", "txt", ""):
        raise AppError("UNSUPPORTED_FILE")
    return "CSV"
