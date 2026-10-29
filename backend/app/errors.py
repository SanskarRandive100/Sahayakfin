"""One error shape for every endpoint: {"error": {"code", "message"}}."""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.ingest import IngestError

log = logging.getLogger("sahayakfin")

_DEFAULT_MESSAGES = {
    "UNAUTHENTICATED": "Please log in again.",
    "FORBIDDEN": "You are not allowed to do this.",
    "OTP_INVALID": "The OTP is wrong. Try again.",
    "TOO_MANY_REQUESTS": "Too many tries. Please wait a minute.",
    "VALIDATION_ERROR": "Some details are missing or wrong.",
    "NOT_FOUND": "Not found.",
    "INTERNAL_ERROR": "Something went wrong on our side. Please try again.",
    "NO_SCORE": "Upload a statement first to get your score.",
    "OFFER_NOT_ACCEPTABLE": "This offer can no longer be accepted.",
    "EXCEEDS_SAFE_INSTALMENT": "This weekly payment is more than you can safely pay.",
    "UNKNOWN_PERSONA": "Unknown demo profile.",
    "BAD_CATEGORY": "That category is not allowed.",
    "BAD_TIP": "Unknown tip code.",
    "CONSENT_REQUIRED": "Please give consent before sharing your statement.",
    "CONSENT_REVOKED": "This consent was withdrawn. Give a new consent to continue.",
    "FILE_TOO_LARGE": "The file is bigger than 5 MB.",
    "UNSUPPORTED_FILE": "This file type is not supported. Upload a PDF or CSV bank statement.",
    "TOO_MANY_PAGES": "The statement has too many pages.",
    "PDF_HAS_SCRIPT": "This PDF contains scripts and cannot be read safely.",
    "NO_TRANSACTIONS": "No transactions were found in this statement.",
}

_INGEST_STATUS = {"BAD_CATEGORY": 400, "BAD_TIP": 400}


class AppError(Exception):
    def __init__(self, code: str, status: int = 400, message: str | None = None):
        self.code = code
        self.status = status
        self.message = message or _DEFAULT_MESSAGES.get(code, code)
        super().__init__(f"{code}: {self.message}")


def error_body(code: str, message: str) -> dict:
    return {"error": {"code": code, "message": message}}


def install_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError):
        return JSONResponse(error_body(exc.code, exc.message), status_code=exc.status)

    @app.exception_handler(IngestError)
    async def _ingest_error(_: Request, exc: IngestError):
        return JSONResponse(error_body(exc.code, exc.message), status_code=_INGEST_STATUS.get(exc.code, 400))

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError):
        first = exc.errors()[0] if exc.errors() else {}
        where = ".".join(str(p) for p in first.get("loc", []) if p not in ("body", "query", "path"))
        msg = f"{where}: {first.get('msg', 'invalid')}" if where else _DEFAULT_MESSAGES["VALIDATION_ERROR"]
        return JSONResponse(error_body("VALIDATION_ERROR", msg), status_code=422)

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException):
        code = {401: "UNAUTHENTICATED", 403: "FORBIDDEN", 404: "NOT_FOUND", 405: "NOT_FOUND",
                429: "TOO_MANY_REQUESTS"}.get(exc.status_code, "VALIDATION_ERROR")
        return JSONResponse(error_body(code, _DEFAULT_MESSAGES[code]), status_code=exc.status_code)

    @app.exception_handler(Exception)
    async def _unknown(request: Request, exc: Exception):
        # Never log request bodies (they may hold statements or PDF passwords).
        log.error("unhandled %s on %s %s", type(exc).__name__, request.method, request.url.path)
        return JSONResponse(error_body("INTERNAL_ERROR", _DEFAULT_MESSAGES["INTERNAL_ERROR"]), status_code=500)
