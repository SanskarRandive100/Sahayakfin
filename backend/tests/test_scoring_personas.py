"""Persona acceptance (CONTRACTS §7), affordability/stress (tasks/02 §2.3), wellness (§2.4), what-if (§2.5)."""
import functools
import time
from datetime import date
from pathlib import Path

import pytest
from test_ingest_parse import parsed

from app.ingest import IngestError, normalize
from app.scoring import (affordability, compute_score, nudges, stress_test, weekly_breakdown, what_if)

SAMPLES = Path(__file__).resolve().parents[2] / "data" / "samples"
KEY = b"demo-payee-hmac-key"
OWNERS = {"ravi": "Ravi Shinde", "sunita": "Sunita Jadhav", "arjun": "Arjun Mehta", "meena": "Meena Pawar"}
PASSWORDS = {"ravi": "RAVI0101", "sunita": "SUNI0101", "arjun": "ARJU0101", "meena": "MEEN0101"}
TODAY = date(2026, 10, 25)

pytestmark = pytest.mark.skipif(not (SAMPLES / "ravi.csv").exists(),
                                reason="run python data/generate_personas.py first")


def txns(slug: str, ext: str = "csv"):
    pw = PASSWORDS[slug] if ext == "locked.pdf" else None
    return normalize(list(parsed(f"{slug}.{ext}", pw).raw), OWNERS[slug], KEY)


@functools.lru_cache(maxsize=None)
def score(slug: str, ext: str = "csv"):
    return compute_score(txns(slug, ext))


# ---------------------------------------------------------------- §7 persona ranges, on every format

FORMATS = ["csv", "pdf", "locked.pdf", "aa.json"]


@pytest.mark.parametrize("ext", FORMATS)
def test_sunita(ext):
    s = score("sunita", ext)
    assert s["score"] >= 85 and s["band"] == "STRONG" and s["confidence"] == "HIGH"


@pytest.mark.parametrize("ext", FORMATS)
def test_ravi(ext):
    s = score("ravi", ext)
    assert 72 <= s["score"] <= 88 and s["band"] in ("STRONG", "GOOD") and s["confidence"] == "HIGH"
    safe = affordability(txns("ravi", ext))["safe_weekly_paise"]
    assert 25000 <= safe <= 40000


@pytest.mark.parametrize("ext", FORMATS)
def test_arjun(ext):
    s = score("arjun", ext)
    assert 35 <= s["score"] <= 55 and s["band"] == "FAIR"
    assert s["metrics"]["bounces"] >= 1
    assert s["components"]["savings_habit"]["value"] == 0


@pytest.mark.parametrize("ext", FORMATS)
def test_meena(ext):
    s = score("meena", ext)
    assert s["confidence"] == "LOW" and s["provisional"] is True and s["weeks_observed"] == 5
    assert "THIN_FILE" in [r["code"] for r in s["reasons"]]


@pytest.mark.parametrize("ext", FORMATS)
def test_ranking(ext):
    assert score("sunita", ext)["score"] > score("ravi", ext)["score"] > score("arjun", ext)["score"]


def test_ravi_story():
    s = score("ravi")
    assert s["as_of"] == "2026-10-25" and s["weeks_observed"] == 12
    assert [r["code"] for r in s["reasons"]] == ["FEW_SAVINGS_WEEKS", "BILLS_LATE"]
    assert all(t["points"] > 0 for t in s["tips"])


def test_sunita_tip_has_points():
    s = score("sunita")
    assert [r["code"] for r in s["reasons"]] == ["INCOME_UNEVEN"]
    assert s["tips"][0]["code"] == "STEADY_INCOME" and s["tips"][0]["points"] >= 1


@pytest.mark.parametrize("slug", list(OWNERS))
def test_deterministic(slug):
    runs = [compute_score(txns(slug)) for _ in range(3)]
    assert runs[0] == runs[1] == runs[2]


def test_compute_score_is_fast():
    t = txns("sunita")  # the largest statement
    start = time.perf_counter()
    compute_score(t)
    assert time.perf_counter() - start < 0.2


# ---------------------------------------------------------------- §2.3 affordability and stress

def test_affordability_shape_and_ravi_payday():
    a = affordability(txns("ravi"))
    assert set(a) == {"safe_weekly_paise", "p25_weekly_surplus_paise", "median_weekly_surplus_paise",
                      "median_weekly_income_paise", "existing_weekly_debt_paise", "rbi_cap_weekly_paise",
                      "payout_weekday", "loan_max_paise"}
    assert a["payout_weekday"] == "FRI"
    assert set(a["loan_max_paise"]) == {"13", "26", "52"}
    assert a["loan_max_paise"]["13"] < a["loan_max_paise"]["26"] < a["loan_max_paise"]["52"]
    assert a["safe_weekly_paise"] <= a["rbi_cap_weekly_paise"]
    assert a["safe_weekly_paise"] == a["p25_weekly_surplus_paise"] // 2 or \
        abs(a["safe_weekly_paise"] * 2 - a["p25_weekly_surplus_paise"]) <= 1


def test_arjun_existing_debt_and_no_safe_amount():
    a = affordability(txns("arjun"))
    assert a["existing_weekly_debt_paise"] > 0      # his microfinance EMI, spread weekly
    assert a["safe_weekly_paise"] == 0 and a["loan_max_paise"]["26"] == 0
    assert a["payout_weekday"] == "TUE"


def test_existing_debt_override():
    t = txns("ravi")
    base = affordability(t)
    more = affordability(t, existing_weekly_debt_paise=50000)
    assert more["existing_weekly_debt_paise"] == 50000
    assert more["safe_weekly_paise"] < base["safe_weekly_paise"]


@pytest.mark.parametrize("slug", ["ravi", "sunita", "arjun"])
def test_stronger_shock_never_covers_more_weeks(slug):
    t = txns(slug)
    covered = [stress_test(t, s, 30678)["weeks_covered"] for s in (0.0, 0.1, 0.2, 0.3)]
    assert covered == sorted(covered, reverse=True)


def test_shock_zero_instalment_zero_covers_all_weeks():
    r = stress_test(txns("sunita"), 0.0, 0)
    assert r["weeks_covered"] == r["weeks_total"] == 12
    assert r["light"] == "GREEN" and r["advice"] == "OK" and r["shortfall_paise"] == 0


def test_arjun_stress_is_not_ok():
    r = stress_test(txns("arjun"), 0.2, 30678)
    assert r["advice"] != "OK" and r["light"] in ("AMBER", "RED")
    assert r["advice"] == "BUILD_BUFFER_FIRST"


def test_stress_shape():
    r = stress_test(txns("ravi"), 0.2, 30678)
    assert set(r) == {"weeks_covered", "weeks_total", "light", "buffer_covers", "shortfall_paise", "advice",
                      "series"}
    assert r["light"] in ("GREEN", "AMBER", "RED")


@pytest.mark.parametrize("slug", list(OWNERS))
def test_stress_series(slug):
    t = txns(slug)
    base = stress_test(t, 0, 30678)["series"]
    assert len(base) == score(slug)["weeks_observed"]
    assert [w["week_start"] for w in base] == sorted(w["week_start"] for w in base)
    assert all(w["surplus_paise"] == w["stressed_surplus_paise"] for w in base)   # shock 0 = unstressed view
    weekly = score(slug)["metrics"]["weekly"]
    assert [w["surplus_paise"] for w in base] == [w["surplus_paise"] for w in weekly]
    for shock in (0.1, 0.2, 0.3):
        for w in stress_test(t, shock, 30678)["series"]:
            assert w["stressed_surplus_paise"] <= w["surplus_paise"]


@pytest.mark.parametrize("slug", list(OWNERS))
def test_metrics_weekly(slug):
    s = score(slug)
    w = s["metrics"]["weekly"]
    assert len(w) == s["weeks_observed"]
    assert [x["week_start"] for x in w] == sorted(x["week_start"] for x in w)
    assert w[-1]["week_start"] == "2026-10-19"
    assert set(w[0]) == {"week_start", "income_paise", "expense_paise", "surplus_paise", "saved"}
    assert sum(x["saved"] for x in w) == s["metrics"]["savings_weeks"]
    incomes = sorted(x["income_paise"] for x in w)
    assert abs(s["metrics"]["median_weekly_income_paise"] - (incomes[(len(w) - 1) // 2] + incomes[len(w) // 2]) / 2) <= 1


# ---------------------------------------------------------------- §2.4 wellness

def test_weekly_breakdown_ravi():
    b = weekly_breakdown(txns("ravi"), weeks=4)
    assert [w["week_start"] for w in b["weeks"]] == ["2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19"]
    for w in b["weeks"]:
        assert w["expense_paise"] == sum(w["by_category"].values())
        assert not {"SAVINGS", "EMI", "SELF_TRANSFER"} & set(w["by_category"])
    assert set(b["avg4_by_category"]) >= {"FUEL", "FOOD"}
    fuel = [w["by_category"].get("FUEL", 0) for w in b["weeks"]]
    assert abs(b["avg4_by_category"]["FUEL"] - sum(fuel) / 4) <= 1


def test_nudges_ravi():
    n = nudges(txns("ravi"), TODAY, {"target_paise": 1000000, "weekly_target_paise": 50000, "saved_paise": 150000})
    codes = [x["code"] for x in n]
    assert len(n) <= 3 and codes[0] == "PAYDAY_SAVE"   # Friday payout, two days ago
    pay = n[0]["params"]
    assert pay["amount_paise"] > 400000
    assert pay["suggest_paise"] >= 2000 and pay["suggest_paise"] % 1000 == 0
    for x in n:
        if x["code"] == "CATEGORY_SPIKE":
            assert x["params"]["pct"] >= 30
        if x["code"] == "GOAL_PROGRESS":
            assert x["params"] == {"done_weeks": 3, "total_weeks": 20}


def test_no_payday_nudge_long_after_payout():
    codes = [x["code"] for x in nudges(txns("ravi"), date(2026, 11, 5), None)]
    assert "PAYDAY_SAVE" not in codes


def test_bill_soon():
    n = nudges(txns("sunita"), date(2026, 10, 31), None)  # rent usually on the 3rd
    soon = [x for x in n if x["code"] == "BILL_SOON"]
    assert soon and soon[0]["params"] == {"category": "RENT", "day": 3}


# ---------------------------------------------------------------- §2.5 what-if

def test_what_if_save_every_week():
    r = what_if(txns("ravi"), "SAVE_EVERY_WEEK")
    tip = next(t for t in score("ravi")["tips"] if t["code"] == "SAVE_EVERY_WEEK")
    assert r["score_before"] == score("ravi")["score"]
    assert r["points"] == tip["points"] > 0
    assert abs(r["score_after"] - (r["score_before"] + r["points"])) <= 1


def test_what_if_bad_tip():
    with pytest.raises(IngestError) as e:
        what_if(txns("ravi"), "WIN_LOTTERY")
    assert e.value.code == "BAD_TIP"
