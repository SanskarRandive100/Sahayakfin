"""Fairness Lab report (tasks/02 §2.5): every test passes on the four personas."""
import functools
import json
from pathlib import Path

import pytest

from app.ingest import parse_statement
from app.scoring import fairness_report

SAMPLES = Path(__file__).resolve().parents[2] / "data" / "samples"
KEY = b"demo-payee-hmac-key"
OWNERS = {"ravi": "Ravi Shinde", "sunita": "Sunita Jadhav", "arjun": "Arjun Mehta", "meena": "Meena Pawar"}
CODES = ["SCALE_HALF", "SCALE_DOUBLE", "NAME_SWAP", "STEADY_BEATS_RICH", "MONOTONIC_SAVINGS", "MONOTONIC_BILLS",
         "MISSING_IS_NOT_BAD", "NO_PROTECTED_INPUTS"]

pytestmark = pytest.mark.skipif(not (SAMPLES / "ravi.aa.json").exists(),
                                reason="run python data/generate_personas.py first")


@functools.lru_cache(maxsize=None)
def report():
    personas = {slug: {"raw": parse_statement((SAMPLES / f"{slug}.aa.json").read_bytes(), "x.json", None).raw,
                       "owner_name": owner} for slug, owner in OWNERS.items()}
    return fairness_report(personas, KEY)


def test_report_shape():
    r = report()
    assert [t["code"] for t in r["tests"]] == CODES
    for t in r["tests"]:
        assert set(t) == {"code", "passed", "detail"}
        assert isinstance(t["detail"], str) and t["detail"].endswith(".")
    assert [p["name"] for p in r["personas"]] == list(OWNERS.values())
    for p in r["personas"]:
        assert set(p) == {"name", "monthly_income_paise", "score", "band", "confidence"}
    json.dumps(r)  # API-serialisable


@pytest.mark.parametrize("code", CODES)
def test_every_fairness_test_passes(code):
    t = next(t for t in report()["tests"] if t["code"] == code)
    assert t["passed"], t["detail"]


def test_steady_beats_rich_numbers():
    by_name = {p["name"]: p for p in report()["personas"]}
    sunita, arjun = by_name["Sunita Jadhav"], by_name["Arjun Mehta"]
    assert sunita["monthly_income_paise"] < arjun["monthly_income_paise"]
    assert sunita["score"] > arjun["score"]


def test_no_protected_inputs_lists_fields():
    detail = next(t for t in report()["tests"] if t["code"] == "NO_PROTECTED_INPUTS")["detail"]
    assert "amount_paise" in detail and "narration" not in detail.split(":")[1].split(".")[0]
