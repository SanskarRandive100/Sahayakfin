"""Settings from env. Loads `.env` from the repo root or from `backend/` (whichever exists)."""
import base64
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = BACKEND_DIR.parent

for _env in (BACKEND_DIR / ".env", REPO_DIR / ".env"):
    if _env.exists():
        load_dotenv(_env, override=False)

_DEMO_DATA_KEY = "hBSQ+34awZpgISGyplbNM+8aIDMKO7JrP6cxnTZmDv4="


def _bool(v: str | None, default: bool) -> bool:
    if v is None:
        return default
    return v.strip().lower() in ("1", "true", "yes", "on")


def _resolve_dir(p: str) -> Path:
    path = Path(p)
    if path.is_absolute():
        return path
    # Relative paths are relative to backend/ (where uvicorn and pytest run).
    return (BACKEND_DIR / path).resolve()


@dataclass(frozen=True)
class Settings:
    database_url: str
    jwt_secret: str
    data_key: bytes
    payee_hmac_key: bytes
    demo_mode: bool
    frontend_origin: str
    samples_dir: Path

    @classmethod
    def from_env(cls) -> "Settings":
        raw_key = os.getenv("DATA_KEY", _DEMO_DATA_KEY)
        try:
            data_key = base64.b64decode(raw_key, validate=True)
        except Exception as e:  # noqa: BLE001
            raise RuntimeError("DATA_KEY must be base64") from e
        if len(data_key) != 32:
            raise RuntimeError("DATA_KEY must decode to exactly 32 bytes (AES-256)")
        return cls(
            database_url=os.getenv("DATABASE_URL", "sqlite:///./sahayakfin.db"),
            jwt_secret=os.getenv("JWT_SECRET", "demo-change-me-8a2ab50e94b16653-sahayakfin"),
            data_key=data_key,
            payee_hmac_key=os.getenv("PAYEE_HMAC_KEY", "demo-payee-hmac-key").encode(),
            demo_mode=_bool(os.getenv("DEMO_MODE"), True),
            frontend_origin=os.getenv("FRONTEND_ORIGIN", "http://localhost:5173"),
            samples_dir=_resolve_dir(os.getenv("SAMPLES_DIR", "../data/samples")),
        )


settings = Settings.from_env()
