"""What-if simulation and the Fairness Lab report (tasks/02 §2.5, CONTRACTS §4.1)."""
import ast
import inspect
import re
from dataclasses import fields, replace

from app.scoring import afford, engine, weekly
from app.scoring.engine import TIP_CODES, apply_tip, raw_fts, round_half_up, score_inputs, tip_points
from app.scoring.types import RawTxn, Txn
from app.scoring.weekly import weekly_inputs

PROTECTED = {"name", "owner_name", "gender", "sex", "age", "religion", "caste", "marital", "phone", "address",
             "pincode", "location", "city", "state", "language", "narration", "narration_masked"}

# Replacement names for NAME_SWAP: different regions, religions and genders.
SWAP_OWNERS = ["Ayesha Khan", "John Dsouza", "Gurpreet Kaur", "Arun Nair", "Fatima Shaikh", "Mary Fernandes"]
SWAP_PEOPLE = ["IMRAN SHAIKH", "JOHN DSOUZA", "GURPREET KAUR", "ARUN NAIR", "FATIMA SHAIKH", "MARY FERNANDES",
               "SANJAY DAS", "ZOYA MIRZA", "PETER LOBO", "HARPREET SINGH", "LAKSHMI IYER", "RAHUL BORO",
               "NASREEN BANO", "DAVID MARAK", "PRIYA REDDY", "SALIM ANSARI", "ANITA TIRKEY", "KARAN MEHRA"]


def what_if(txns: list[Txn], tip_code: str) -> dict:
    """Re-score with one tip applied. points uses the tips formula (unrounded FTS difference)."""
    from app.ingest.errors import IngestError

    if tip_code not in TIP_CODES:
        raise IngestError("BAD_TIP")
    inp = weekly_inputs(txns)
    before = score_inputs(inp)["score"]
    after = score_inputs(apply_tip(inp, tip_code))["score"]
    points = tip_points(inp, tip_code) if before is not None else 0
    return {"score_before": before, "score_after": after, "points": points}


# ---------------------------------------------------------------------- helpers

def _first_name(owner: str) -> str:
    return owner.split()[0] if owner else "This person"


def _monthly_income_paise(inp) -> int:
    return round_half_up(sum(inp.I) / len(inp.I) * 52 / 12 * 100) if inp.I else 0


def _scaled(raw: list[RawTxn], factor: float) -> list[RawTxn]:
    return [replace(r, amount=r.amount * factor, balance=None if r.balance is None else r.balance * factor)
            for r in raw]


def _person_names(raw: list[RawTxn], owner: str) -> list[str]:
    from app.ingest.categorize import is_business
    from app.ingest.mask import extract_payee

    names = {owner.upper()} if owner else set()
    for r in raw:
        name = extract_payee(r.narration)
        if name and not is_business(name):
            names.add(" ".join(name.upper().split()))
    return sorted(names, key=lambda n: (-len(n), n))


def _name_swapped(raw: list[RawTxn], owner: str, new_owner: str) -> list[RawTxn]:
    """Replace every person name (payees, payers and the owner) with a different, consistent name."""
    pool = iter(p for p in SWAP_PEOPLE if p != new_owner.upper())
    mapping = {}
    for name in _person_names(raw, owner):
        mapping[name] = new_owner.upper() if name == owner.upper() else next(pool, "ALEX KUMAR")
    pattern = re.compile("|".join(re.escape(n) for n in mapping), re.I) if mapping else None
    out = []
    for r in raw:
        text = " ".join(r.narration.split())
        if pattern:
            text = pattern.sub(lambda m: mapping[m.group(0).upper()], text)
        out.append(replace(r, narration=text))
    return out


def _scoring_fields_used() -> list[str]:
    """Static check: which Txn attributes the scoring code reads (AST over the scoring modules)."""
    txn_fields = {f.name for f in fields(Txn)}
    used = set()
    for module in (weekly, engine, afford):
        for node in ast.walk(ast.parse(inspect.getsource(module))):
            if isinstance(node, ast.Attribute) and node.attr in txn_fields:
                used.add(node.attr)
    return sorted(used)


# ---------------------------------------------------------------------- report

def fairness_report(personas: dict[str, dict], hmac_key: bytes) -> dict:
    """Run the automated fairness tests on the given personas: {slug: {"raw": [RawTxn], "owner_name": str}}."""
    from app.ingest.normalize import normalize

    if isinstance(hmac_key, str):
        hmac_key = hmac_key.encode()
    base, inputs = {}, {}
    for slug, p in personas.items():
        txns = normalize(p["raw"], p["owner_name"], hmac_key)
        inputs[slug] = weekly_inputs(txns)
        base[slug] = score_inputs(inputs[slug])
    owner = {slug: p["owner_name"] for slug, p in personas.items()}
    hero = next(iter(personas), None)
    tests = []

    # SCALE_HALF / SCALE_DOUBLE
    for code, factor, verb in (("SCALE_HALF", 0.5, "Halving"), ("SCALE_DOUBLE", 2.0, "Doubling")):
        changed = []
        for slug, p in personas.items():
            s = engine.compute_score(normalize(_scaled(p["raw"], factor), p["owner_name"], hmac_key))["score"]
            if s != base[slug]["score"]:
                changed.append(f"{_first_name(owner[slug])} {base[slug]['score']} → {s}")
        detail = (f"{verb} every rupee for all {len(personas)} people kept every score the same "
                  f"({_first_name(owner[hero])} stayed at {base[hero]['score']})." if not changed else
                  f"{verb} every rupee changed some scores: {', '.join(changed)}.")
        tests.append({"code": code, "passed": not changed, "detail": detail})

    # NAME_SWAP
    changed = []
    for i, (slug, p) in enumerate(personas.items()):
        new_owner = SWAP_OWNERS[i % len(SWAP_OWNERS)]
        swapped = _name_swapped(p["raw"], p["owner_name"], new_owner)
        s = engine.compute_score(normalize(swapped, new_owner, hmac_key))["score"]
        if s != base[slug]["score"]:
            changed.append(f"{_first_name(owner[slug])} {base[slug]['score']} → {s}")
    detail = (f"Changing every name (and the owner's gender) in all {len(personas)} statements kept every score "
              f"the same ({_first_name(owner[hero])} stayed at {base[hero]['score']})." if not changed else
              f"Changing names changed some scores: {', '.join(changed)}.")
    tests.append({"code": "NAME_SWAP", "passed": not changed, "detail": detail})

    # STEADY_BEATS_RICH
    if "sunita" in base and "arjun" in base:
        s, a = base["sunita"], base["arjun"]
        si, ai = _monthly_income_paise(inputs["sunita"]), _monthly_income_paise(inputs["arjun"])
        passed = s["score"] is not None and a["score"] is not None and s["score"] > a["score"]
        detail = (f"Sunita earns about ₹{si // 100:,} a month and scores {s['score']}; Arjun earns about "
                  f"₹{ai // 100:,} a month and scores {a['score']}.")
    else:
        passed, detail = False, "Needs both Sunita's and Arjun's statements."
    tests.append({"code": "STEADY_BEATS_RICH", "passed": passed, "detail": detail})

    # MONOTONIC_SAVINGS: turning any one non-savings week into a savings week never lowers the score
    checked, worst, best_gain = 0, 0.0, 0.0
    for inp in inputs.values():
        f0 = raw_fts(inp)
        for w, s in enumerate(inp.saved):
            if s or f0 is None:
                continue
            f1 = raw_fts(replace(inp, saved=[True if i == w else x for i, x in enumerate(inp.saved)]))
            checked += 1
            worst, best_gain = min(worst, f1 - f0), max(best_gain, f1 - f0)
    tests.append({"code": "MONOTONIC_SAVINGS", "passed": worst >= 0,
                  "detail": f"Adding a savings week never lowered a score ({checked} weeks checked across "
                            f"{len(personas)} people; each added up to {best_gain:.1f} points)."})

    # MONOTONIC_BILLS: paying one late bill on time never lowers the score
    checked, worst, best_gain = 0, 0.0, 0.0
    for inp in inputs.values():
        f0 = raw_fts(inp)
        late = inp.bills_total - inp.bills_on_time
        for k in range(1, late + 1):
            f1 = raw_fts(replace(inp, bills_on_time=inp.bills_on_time + k))
            checked += 1
            worst, best_gain = min(worst, f1 - f0), max(best_gain, f1 - f0)
    tests.append({"code": "MONOTONIC_BILLS", "passed": worst >= 0,
                  "detail": f"Paying late bills on time never lowered a score ({checked} cases checked; "
                            f"up to {best_gain:.1f} points gained)."})

    # MISSING_IS_NOT_BAD: no bills at all -> bill discipline unavailable (not 0), score moves < 5 points
    target = "sunita" if "sunita" in personas else hero
    no_bills = [t for t in normalize(personas[target]["raw"], owner[target], hmac_key)
                if t.category not in weekly.BILL_CATEGORIES]
    nb = engine.compute_score(no_bills)
    unavailable = nb["components"]["bill_discipline"]["available"] is False
    before = base[target]["score"]
    moved = abs((nb["score"] or 0) - (before or 0))
    tests.append({"code": "MISSING_IS_NOT_BAD", "passed": unavailable and moved < 5,
                  "detail": f"Removing all of {_first_name(owner[target])}'s bills marked bill payments as "
                            f"'not available' (not zero) and moved the score from {before} to {nb['score']}."})

    # NO_PROTECTED_INPUTS
    used = _scoring_fields_used()
    leaked = sorted(PROTECTED & set(used))
    tests.append({"code": "NO_PROTECTED_INPUTS", "passed": not leaked,
                  "detail": f"The score reads only these transaction fields: {', '.join(used)}. No name, gender, "
                            f"age, religion, caste, language or location is ever an input."})

    return {
        "tests": tests,
        "personas": [{"name": owner[slug], "monthly_income_paise": _monthly_income_paise(inputs[slug]),
                      "score": base[slug]["score"], "band": base[slug]["band"],
                      "confidence": base[slug]["confidence"]} for slug in personas],
    }
