"""The supported sample check must detect a regression rather than merely print it."""
import importlib.util
import sys
from pathlib import Path

from app import scoring


def test_generator_check_returns_failure_on_format_mismatch(monkeypatch, capsys):
    root = Path(__file__).resolve().parents[2]
    spec = importlib.util.spec_from_file_location("verification_generator", root / "data/generate_personas.py")
    module = importlib.util.module_from_spec(spec)
    monkeypatch.setitem(sys.modules, spec.name, module)
    spec.loader.exec_module(module)
    monkeypatch.setattr(module, "PERSONAS", {"ravi": module.PERSONAS["ravi"]})
    original = scoring.compute_score
    calls = []

    def mismatched_score(txns):
        result = original(txns)
        calls.append(result)
        if len(calls) == 2:
            result["score"] -= 1
        return result

    monkeypatch.setattr(scoring, "compute_score", mismatched_score)
    assert module.check() == 1
    assert "MISMATCH: ravi.pdf" in capsys.readouterr().out
