"""Read synthetic samples and print reproducible JSON evidence; never write statement data."""
import hashlib
import json
import sys
from dataclasses import replace
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "data"))

from personas import PERSONAS
from app.ingest import normalize, parse_statement
from app.scoring import affordability, compute_score, fairness_report, stress_test, what_if
from app.scoring.engine import ENGINE_VERSION
from app.scoring.types import RawTxn
from app.finance import kfs, match_offers, schedule

KEY = b"demo-payee-hmac-key"
SAMPLES = ROOT / "data" / "samples"
LENDERS = [
    {"id": "alpha", "name": "MFI Alpha", "min_band": "FAIR", "min_weeks": 8},
    {"id": "beta", "name": "MFI Beta", "min_band": "GOOD", "min_weeks": 10},
    {"id": "gamma", "name": "MFI Gamma", "min_band": "STRONG", "min_weeks": 12},
]
PRODUCTS = [
    {"id": "alpha-weekly", "lender_id": "alpha", "kind": "LOAN", "min_paise": 200000,
     "max_paise": 1000000, "rate_pct": 24, "fee_pct": 2, "tenures": [13, 26, 52]},
    {"id": "beta-flexi", "lender_id": "beta", "kind": "LOAN", "min_paise": 500000,
     "max_paise": 2500000, "rate_pct": 21, "fee_pct": 1, "tenures": [26, 52]},
    {"id": "gamma-growth", "lender_id": "gamma", "kind": "LOAN", "min_paise": 1000000,
     "max_paise": 5000000, "rate_pct": 18, "fee_pct": 1.5, "tenures": [26, 52]},
]


def balance_rows(income, expense, ignored_credit=0):
    """A fully synthetic balanced ledger exposing two unresolved specification interactions."""
    rows, balance = [], 1000
    for week in range(12):
        day = date(2026, 8, 3) + timedelta(weeks=week)
        balance += income
        rows.append(RawTxn(day, "NEFT CR-DEMO PLATFORM-PAYOUT", income, "CR", balance))
        if week == 5 and ignored_credit:
            balance += ignored_credit
            rows.append(RawTxn(day + timedelta(days=2), "NEFT CR-DEMO FINANCE-LOAN DISB", ignored_credit, "CR", balance))
        balance -= expense
        rows.append(RawTxn(day + timedelta(days=6), "FOOD", expense, "DR", balance))
    return rows


def contract_observations():
    base = compute_score(normalize(balance_rows(5000, 5000), None, KEY))
    injected = compute_score(normalize(balance_rows(5000, 5000, 1000), None, KEY))
    low = balance_rows(500, 485)
    scaled = [replace(t, amount=t.amount * 2, balance=t.balance * 2) for t in low]
    small = compute_score(normalize(low, None, KEY))
    double = compute_score(normalize(scaled, None, KEY))
    card = kfs(750000, 24, 2, 26)
    return {
        "ignored_credit_balance_growth": {
            "score_before": base["score"], "score_after": injected["score"],
            "saved_weeks_before": base["metrics"]["savings_weeks"],
            "saved_weeks_after": injected["metrics"]["savings_weeks"],
            "income_unchanged": base["metrics"]["median_weekly_income_paise"] == injected["metrics"]["median_weekly_income_paise"],
        },
        "fixed_savings_floor_scale_counterexample": {
            "score_before": small["score"], "score_after_doubling": double["score"],
            "saved_weeks_before": small["metrics"]["savings_weeks"],
            "saved_weeks_after_doubling": double["metrics"]["savings_weeks"],
        },
        "kfs_text_vs_golden_vector": {
            "exact_emi_total_paise": card["total_repayable_paise"],
            "rounded_instalment_times_weeks_paise": card["instalment_paise"] * card["n_instalments"],
        },
    }


def verify():
    personas, raw_personas, all_formats_match = {}, {}, True
    for slug, persona in PERSONAS.items():
        formats, baseline = {}, None
        extensions = ["csv", "pdf", "locked.pdf", "aa.json"] + (["alt.pdf"] if slug == "ravi" else [])
        for ext in extensions:
            path = SAMPLES / f"{slug}.{ext}"
            data = path.read_bytes()
            password = persona["display_name"].split()[0][:4].upper() + "0101" if ext == "locked.pdf" else None
            parsed = parse_statement(data, path.name, password)
            txns = normalize(parsed.raw, persona["display_name"], KEY)
            score, afford = compute_score(txns), affordability(txns)
            canonical = [(t.date, t.narration, t.amount, t.direction, t.balance) for t in parsed.raw]
            if baseline is None:
                baseline = canonical, score, afford
                raw_personas[slug] = {"raw": parsed.raw, "owner_name": persona["display_name"]}
                offers = match_offers(score, afford, LENDERS, PRODUCTS, 1000000)
                personas[slug] = {
                    "score_result": score, "affordability": afford, "offers_requested_1000000_paise": offers,
                    "what_if": {t["code"]: what_if(txns, t["code"]) for t in score["tips"]},
                    "stress": {str(shock): stress_test(txns, shock, 29451) for shock in (0, .1, .2, .3)},
                }
            same = (canonical, score, afford) == baseline
            all_formats_match &= same
            formats[ext] = {"rows": len(txns), "score": score["score"], "band": score["band"],
                            "confidence": score["confidence"], "matches_csv": same,
                            "sha256": hashlib.sha256(data).hexdigest(), "warnings": parsed.warnings}
        personas[slug]["formats"] = formats
    fairness = fairness_report(raw_personas, KEY)
    rows = schedule(720000, 24, 26, date(2026, 10, 29), "FRI")
    return {
        "engine_version": ENGINE_VERSION, "statement_as_of": "2026-10-25", "synthetic_only": True,
        "all_formats_match": all_formats_match, "personas": personas, "fairness": fairness,
        "ravi_alpha_schedule": {"rows": len(rows), "first_due": rows[0]["due_date"].isoformat(),
                                "all_fridays": all(r["due_date"].weekday() == 4 for r in rows),
                                "total_paise": sum(r["amount_paise"] for r in rows),
                                "kfs_total_paise": kfs(720000, 24, 2, 26)["total_repayable_paise"]},
        "unresolved_contract_observations": contract_observations(),
    }


if __name__ == "__main__":
    result = verify()
    print(json.dumps(result, indent=2, ensure_ascii=True, allow_nan=False))
    sys.exit(0 if result["all_formats_match"] and all(t["passed"] for t in result["fairness"]["tests"]) else 1)
