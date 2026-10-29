"""STUB (1.1)."""


def what_if(txns, tip_code: str) -> dict:
    return {"score_before": 81, "score_after": 94, "points": 13}


def fairness_report(personas: dict, hmac_key: bytes) -> dict:
    codes = ["SCALE_HALF", "SCALE_DOUBLE", "NAME_SWAP", "STEADY_BEATS_RICH", "MONOTONIC_SAVINGS",
             "MONOTONIC_BILLS", "MISSING_IS_NOT_BAD", "NO_PROTECTED_INPUTS"]
    return {"tests": [{"code": c, "passed": True, "detail": "Placeholder."} for c in codes],
            "personas": [{"name": "Ravi Shinde", "monthly_income_paise": 2100000, "score": 81, "band": "STRONG",
                          "confidence": "HIGH"}]}
