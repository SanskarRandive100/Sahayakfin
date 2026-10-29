"""Fairness Lab: runs the engine's fairness tests on the 4 synthetic personas. No auth (synthetic data only)."""
import threading
import time

from fastapi import APIRouter

from app import ingest, scoring
from app.config import settings
from app.errors import AppError
from app.services.scoring_service import _jsonable

router = APIRouter(tags=["fairness"])

PERSONA_NAMES = {"ravi": "Ravi Shinde", "sunita": "Sunita Jadhav", "arjun": "Arjun Mehta", "meena": "Meena Pawar"}
CACHE_TTL_S = 600
_cache: dict = {"at": 0.0, "value": None}
_lock = threading.Lock()


def build_report() -> dict:
    personas = {}
    for slug, name in PERSONA_NAMES.items():
        path = settings.samples_dir / f"{slug}.aa.json"
        if not path.is_file():
            raise AppError("NOT_FOUND", 404, "Sample data is not generated yet (python data/generate_personas.py).")
        parsed = ingest.parse_statement(path.read_bytes(), path.name, None)
        personas[slug] = {"raw": parsed.raw, "owner_name": name}
    return _jsonable(scoring.fairness_report(personas, settings.payee_hmac_key))


@router.get("/fairness/report")
def report():
    with _lock:
        if _cache["value"] is None or time.monotonic() - _cache["at"] > CACHE_TTL_S:
            _cache["value"] = build_report()
            _cache["at"] = time.monotonic()
        return _cache["value"]


def clear_cache() -> None:
    with _lock:
        _cache["value"] = None
