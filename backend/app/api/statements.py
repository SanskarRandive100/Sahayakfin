import json
import logging
import re

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.errors import AppError
from app.models import User
from app.schemas import AaFetchIn
from app.security.deps import current_user
from app.security.upload_guard import MAX_BYTES, validate_upload
from app.services.pipeline import run_pipeline, user_consent

router = APIRouter(tags=["statements"])
log = logging.getLogger("sahayakfin")

PERSONAS = ("ravi", "sunita", "arjun", "meena")


@router.post("/statements")
async def upload_statement(file: UploadFile = File(...), consent_id: str = Form(...),
                           password: str | None = Form(None),
                           user: User = Depends(current_user), db: Session = Depends(get_db)):
    consent = user_consent(db, user, consent_id)
    # Bound the route read; framework multipart parsing may already have spooled to a temporary file.
    data = await file.read(MAX_BYTES + 1)
    filename = re.sub(r"[^\w.\-]", "_", file.filename or "upload")[-80:]
    await file.close()
    validate_upload(data, filename)
    try:
        # The password is passed once to the parser and never stored or logged.
        result = run_pipeline(db, user, consent, data, filename, password or None)
    finally:
        del data
        password = None  # noqa: F841
    log.info("statement processed kind=%s txns=%s", result["kind"], result["txn_count"])
    return result


def read_aa_sample(persona: str) -> bytes:
    if persona not in PERSONAS:
        raise AppError("UNKNOWN_PERSONA")
    path = settings.samples_dir / f"{persona}.aa.json"
    if not path.is_file():
        raise AppError("UNKNOWN_PERSONA", 400, "Demo data for this profile is not available yet.")
    return path.read_bytes()


@router.post("/aa/fetch")
def aa_fetch(body: AaFetchIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    consent = user_consent(db, user, body.consent_id)
    data = read_aa_sample(body.persona)
    try:
        json.loads(data)
    except ValueError:
        raise AppError("UNSUPPORTED_FILE")
    # Simulated bank latency so the processing stages are visible in the demo.
    return run_pipeline(db, user, consent, data, f"{body.persona}.aa.json", None,
                        extra_read_ms=600 if settings.demo_mode else 0)
