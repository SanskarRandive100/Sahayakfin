"""Financial Trust Score (CONTRACTS §3): components, FTS, band, confidence, reasons and tips."""
import math
from dataclasses import replace
from datetime import date
from typing import Optional, Sequence

import numpy as np

from app.scoring.types import Txn
from app.scoring.weekly import MAX_WEEKS, WeeklyInputs, weekly_inputs

ENGINE_VERSION = "fts-2.0"
WEIGHTS = {"income_stability": 0.30, "savings_habit": 0.25, "bill_discipline": 0.25, "expense_health": 0.20}
BAND_FLOORS = [("STRONG", 80), ("GOOD", 60), ("FAIR", 40), ("BUILDING", 0)]
BOUNCE_PENALTY = 25
MIN_WEEKS = 4
SAVE_MIN_PAISE = 2000
TIP_FOR_COMPONENT = {"income_stability": "STEADY_INCOME", "savings_habit": "SAVE_EVERY_WEEK",
                     "bill_discipline": "PAY_BILLS_ON_TIME", "expense_health": "KEEP_SURPLUS_WEEKS"}
TIP_CODES = set(TIP_FOR_COMPONENT.values()) | {"ADD_MORE_HISTORY"}


def round_half_up(x: float) -> int:
    return math.floor(x + 0.5)


def paise(rupees: float) -> int:
    return round_half_up(rupees * 100)


def band(R: float) -> float:
    """Expense-ratio band: 100 up to 0.90, linear to 0 at 1.20, 0 beyond."""
    if R <= 0.90:
        return 100.0
    if R <= 1.20:
        return max(0.0, 100 - (R - 0.90) / 0.30 * 100)
    return 0.0


def _stats(I: Sequence[float], E: Sequence[float], E_smooth: Optional[Sequence[float]]) -> dict:
    W = len(I)
    Es = E_smooth if E_smooth is not None else E
    sum_i, sum_e = float(sum(I)), float(sum(E))
    return {
        "W": W,
        "p50": float(np.median(I)) if W else 0.0,
        "p25": float(np.percentile(I, 25)) if W else 0.0,
        "R": sum_e / sum_i if sum_i > 0 else math.inf,
        "w_surplus": sum(1 for i, e in zip(I, Es) if e <= i),
    }


def components(I, E, saved, on_time, total, bounces, E_smooth=None) -> dict[str, Optional[float]]:
    """Component values 0–100; None means unavailable (its weight is re-spread)."""
    s = _stats(I, E, E_smooth)
    W = s["W"]
    return {
        "income_stability": 100 * min(s["p25"] / s["p50"], 1.0) if s["p50"] > 0 else None,
        "savings_habit": 100 * sum(1 for x in saved if x) / W if W else None,
        "bill_discipline": max(0.0, 100 * on_time / total - BOUNCE_PENALTY * bounces) if total > 0 else None,
        "expense_health": 0.5 * band(s["R"]) + 0.5 * 100 * s["w_surplus"] / W if W else None,
    }


def fts(comps: dict[str, Optional[float]]) -> Optional[float]:
    avail = {k: v for k, v in comps.items() if v is not None}
    weight = sum(WEIGHTS[k] for k in avail)
    if weight == 0:
        return None
    return sum(WEIGHTS[k] * v for k, v in avail.items()) / weight


def band_of(score: Optional[int]) -> Optional[str]:
    if score is None:
        return None
    for name, floor in BAND_FLOORS:
        if score >= floor:
            return name
    return "BUILDING"


def confidence(W_obs: int, categorised_share: float, cash_share: float = 0.0) -> str:
    if W_obs < MIN_WEEKS:
        return "NONE"
    if W_obs <= 7:
        level = "LOW"
    elif W_obs <= 11:
        level = "MEDIUM"
    else:
        level = "HIGH" if categorised_share >= 0.80 else "MEDIUM"
    if cash_share > 0.5:
        # Downgrade one level, but never to NONE: confidence must not take the score away.
        level = {"HIGH": "MEDIUM", "MEDIUM": "LOW", "LOW": "LOW"}[level]
    return level


# ---------------------------------------------------------------- tips (simulated changes, CONTRACTS §3)

def apply_tip(inp: WeeklyInputs, code: str) -> WeeklyInputs:
    if code == "SAVE_EVERY_WEEK":
        return replace(inp, saved=[True] * len(inp.saved))
    if code == "PAY_BILLS_ON_TIME":
        return replace(inp, bills_on_time=inp.bills_total, bounces=0)
    if code == "KEEP_SURPLUS_WEEKS":
        return replace(inp, E=[min(e, i) for e, i in zip(inp.E, inp.I)],
                       E_smooth=[min(e, i) for e, i in zip(inp.E_smooth, inp.I)])
    if code == "STEADY_INCOME":
        if not inp.I:
            return inp
        p50 = float(np.median(inp.I))
        return replace(inp, I=[max(i, p50) for i in inp.I])
    return inp  # ADD_MORE_HISTORY: nothing to simulate


def raw_fts(inp: WeeklyInputs) -> Optional[float]:
    return fts(components(inp.I, inp.E, inp.saved, inp.bills_on_time, inp.bills_total, inp.bounces, inp.E_smooth))


def tip_points(inp: WeeklyInputs, code: str) -> int:
    before, after = raw_fts(inp), raw_fts(apply_tip(inp, code))
    if before is None or after is None:
        return 0
    return round_half_up(after - before)


# ---------------------------------------------------------------- reasons

def _reason(component: str, inp: WeeklyInputs, s: dict, comp_value: float) -> dict:
    W = s["W"]
    if component == "income_stability":
        return {"code": "INCOME_UNEVEN", "component": component,
                "params": {"p25_paise": paise(s["p25"]), "median_paise": paise(s["p50"])}}
    if component == "savings_habit":
        weeks = sum(1 for x in inp.saved if x)
        return {"code": "NO_SAVINGS_SEEN" if comp_value == 0 else "FEW_SAVINGS_WEEKS", "component": component,
                "params": {"weeks": weeks, "of": W}}
    if component == "bill_discipline":
        late = inp.bills_total - inp.bills_on_time
        if inp.bounces > 0:
            return {"code": "BILL_BOUNCE", "component": component,
                    "params": {"bounces": inp.bounces, "late": late, "of": inp.bills_total}}
        return {"code": "BILLS_LATE", "component": component, "params": {"late": late, "of": inp.bills_total}}
    if s["R"] > 0.90:
        return {"code": "SPENDING_ABOVE_INCOME", "component": component,
                "params": {"ratio_pct": round_half_up(s["R"] * 100) if math.isfinite(s["R"]) else None}}
    return {"code": "FEW_SURPLUS_WEEKS", "component": component, "params": {"weeks": s["w_surplus"], "of": W}}


def _tip(code: str, inp: WeeklyInputs, s: dict) -> dict:
    params: dict = {}
    if code == "SAVE_EVERY_WEEK":
        params = {"min_amount_paise": SAVE_MIN_PAISE}
    elif code == "KEEP_SURPLUS_WEEKS":
        params = {"deficit_weeks": s["W"] - s["w_surplus"]}
    elif code == "STEADY_INCOME":
        params = {"median_paise": paise(s["p50"])}
    elif code == "ADD_MORE_HISTORY":
        return {"code": code, "points": 0, "params": {"weeks_needed": max(0, MAX_WEEKS - s["W"])}}
    return {"code": code, "points": tip_points(inp, code), "params": params}


# ---------------------------------------------------------------- results

def score_inputs(inp: WeeklyInputs) -> dict:
    """ScoreResult (CONTRACTS §3.1) from precomputed weekly inputs."""
    comps = components(inp.I, inp.E, inp.saved, inp.bills_on_time, inp.bills_total, inp.bounces, inp.E_smooth)
    s = _stats(inp.I, inp.E, inp.E_smooth)
    W = s["W"]
    conf = confidence(W, inp.categorised_share, inp.cash_share)
    if s["p50"] <= 0:
        conf = "NONE"
    value = fts(comps)
    score = round_half_up(value) if conf != "NONE" and value is not None else None

    reasons: list[dict] = []
    tips: list[dict] = []
    if score is None:
        if W < MIN_WEEKS:
            reasons = [{"code": "THIN_FILE", "component": None, "params": {"weeks": W}}]
            tips = [_tip("ADD_MORE_HISTORY", inp, s)]
        else:  # enough weeks but median weekly income is zero
            reasons = [_reason("income_stability", inp, s, 0.0)]
    else:
        ranked = sorted(((WEIGHTS[k] * (100 - v), k) for k, v in comps.items() if v is not None),
                        key=lambda x: -x[0])  # stable: ties keep WEIGHTS order
        for shortfall, k in ranked[:2]:
            if shortfall > 0:
                reasons.append(_reason(k, inp, s, comps[k]))
                tips.append(_tip(TIP_FOR_COMPONENT[k], inp, s))
        if conf == "LOW":
            reasons.append({"code": "THIN_FILE", "component": None, "params": {"weeks": W}})
            tips.append(_tip("ADD_MORE_HISTORY", inp, s))

    return {
        "score": score,
        "band": band_of(score),
        "confidence": conf,
        "provisional": conf == "LOW",
        "weeks_observed": W,
        "as_of": inp.as_of.isoformat() if inp.as_of else None,
        "components": {k: {"value": None if v is None else round(v, 2), "weight": WEIGHTS[k],
                           "available": v is not None}
                       for k, v in comps.items()},
        "metrics": {
            "median_weekly_income_paise": paise(s["p50"]),
            "p25_weekly_income_paise": paise(s["p25"]),
            "expense_ratio": round(s["R"], 4) if math.isfinite(s["R"]) else None,
            "weeks_in_surplus": s["w_surplus"],
            "bills_on_time": inp.bills_on_time,
            "bills_total": inp.bills_total,
            "bounces": inp.bounces,
            "savings_weeks": sum(1 for x in inp.saved if x),
            "categorised_share": round(inp.categorised_share, 2),
        },
        "reasons": reasons,
        "tips": tips,
        "engine_version": ENGINE_VERSION,
    }


def score_from_weekly(I, E, saved, bills_on_time, bills_total, bounces, D=None, *, E_smooth=None,
                      categorised_share: float = 1.0, cash_share: float = 0.0,
                      as_of: Optional[date] = None) -> dict:
    """Pure weekly-level scoring (golden vectors, CONTRACTS §7). Amounts in rupees."""
    I = [float(x) for x in I]
    E = [float(x) for x in E]
    inp = WeeklyInputs(I=I, E=E, D=[float(x) for x in D] if D is not None else [0.0] * len(I),
                       saved=[bool(x) for x in saved],
                       E_smooth=[float(x) for x in E_smooth] if E_smooth is not None else list(E),
                       bills_on_time=bills_on_time, bills_total=bills_total, bounces=bounces,
                       categorised_share=categorised_share, cash_share=cash_share, as_of=as_of)
    return score_inputs(inp)


def compute_score(txns: list[Txn], as_of: Optional[date] = None) -> dict:
    """ScoreResult for normalised transactions. R and stability use actual weeks; W_surplus uses smoothed bills."""
    return score_inputs(weekly_inputs(txns, as_of))
