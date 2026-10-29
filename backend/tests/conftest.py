"""Temp SQLite DB per test session, a TestClient, and login/upload helpers."""
import os
import random
import sys
import tempfile
from uuid import uuid4
from datetime import date, timedelta
from pathlib import Path

# Never inherit the application's DATABASE_URL: tests can delete/reset data.
_TEST_URL = os.environ.get("TEST_DATABASE_URL")
if _TEST_URL:
    from sqlalchemy.engine import make_url
    url = make_url(_TEST_URL)
    name = url.database or ""
    if (url.get_backend_name() != "postgresql"
            or not (name.startswith(("test_", "sahayakfin_test_")) or name.endswith("_test"))):
        raise RuntimeError("TEST_DATABASE_URL must name an explicitly disposable PostgreSQL test database")
    os.environ["DATABASE_URL"] = _TEST_URL
else:
    _TMP = tempfile.TemporaryDirectory(prefix="sahayak-test-")
    os.environ["DATABASE_URL"] = f"sqlite:///{Path(_TMP.name, 'test.db').as_posix()}"
os.environ["SEED_DEMO_DATA"] = "false"
os.environ["DEMO_MODE"] = "true"
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.security.ratelimit import otp_limiter  # noqa: E402
from app.services import clock  # noqa: E402

SAMPLES = Path(__file__).resolve().parents[2] / "data" / "samples"


@pytest.fixture(scope="session")
def _database_schema():
    from sqlalchemy import text
    from app.db import engine
    schema = "test_" + uuid4().hex
    if _TEST_URL:
        with engine.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        engine.update_execution_options(schema_translate_map={None: schema})
    try:
        yield
    finally:
        if _TEST_URL:
            engine.update_execution_options(schema_translate_map=None)
            with engine.begin() as connection:
                connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        engine.dispose()
        if not _TEST_URL:
            _TMP.cleanup()


@pytest.fixture(scope="session")
def client(_database_schema):
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def _reset_state():
    otp_limiter.reset()
    clock.reset()
    yield
    clock.reset()


def new_phone() -> str:
    return "8" + "".join(random.choice("0123456789") for _ in range(9))


def login(client, phone: str | None = None) -> dict:
    phone = phone or new_phone()
    r = client.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": "123456"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def give_consent(client, headers, **kw) -> str:
    body = {"purpose": "LOAN_ASSESSMENT", "fi_types": ["DEPOSIT"], "range_days": 90, "data_life_days": 30,
            "fetch_type": "ONETIME", **kw}
    r = client.post("/api/v1/consents", json=body, headers=headers)
    assert r.status_code == 200, r.text
    return r.json()["id"]


def inline_csv(weeks: int = 13, end: date = date(2026, 10, 25)) -> bytes:
    """A small, valid CONTRACTS Â§2.5 CSV: weekly Friday payout, daily fuel/food, monthly rent and phone."""
    start = end - timedelta(weeks=weeks) + timedelta(days=1)
    bal, lines = 5000.0, ["date,narration,debit,credit,balance"]
    d = start
    while d <= end:
        rows = []
        if d.weekday() == 4:
            rows.append(("NEFT CR-QUICKBITE TECHNOLOGIES PVT LTD-WEEKLY PAYOUT", 0, 5200))
        if d.weekday() == 0:
            rows.append(("UPI/DR/412345678901/RD SAVINGS GOAL/ippb@ippb/save", 100, 0))
        rows.append(("UPI/DR/412345678902/HP PETROL PUMP/hppay@icici/fuel", 180, 0))
        rows.append(("UPI/DR/412345678903/SAI KIRANA STORE/saikirana@ybl/food", 220, 0))
        if d.day == 5:
            rows.append(("UPI/DR/412345678904/ROOM RENT/landlord@okaxis/rent", 3000, 0))
        if d.day == 10:
            rows.append(("UPI/DR/412345678905/JIO PREPAID RECHARGE/jio@paytm/recharge", 299, 0))
        for narr, dr, cr in rows:
            bal += cr - dr
            lines.append(f"{d.isoformat()},{narr},{dr or ''},{cr or ''},{bal:.2f}")
        d += timedelta(days=1)
    return ("\n".join(lines) + "\n").encode()


def statement_bytes() -> tuple[bytes, str]:
    p = SAMPLES / "ravi.csv"
    if p.is_file():
        return p.read_bytes(), "ravi.csv"
    return inline_csv(), "statement.csv"


def upload(client, headers, consent_id, data=None, filename=None, password=None):
    if data is None:
        data, filename = statement_bytes()
    form = {"consent_id": consent_id}
    if password:
        form["password"] = password
    return client.post("/api/v1/statements", headers=headers, data=form,
                       files={"file": (filename, data, "application/octet-stream")})


def onboard(client, phone: str | None = None) -> tuple[dict, str]:
    """Login + consent + upload. Returns (headers, consent_id)."""
    h = login(client, phone)
    cid = give_consent(client, h)
    r = upload(client, h, cid)
    assert r.status_code == 200, r.text
    return h, cid
