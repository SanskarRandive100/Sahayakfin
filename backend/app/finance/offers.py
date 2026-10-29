"""Offer matching (CONTRACTS §4, steps 1–7)."""
from app.finance.kfs import kfs, loan_max

BAND_ORDER = {"BUILDING": 0, "FAIR": 1, "GOOD": 2, "STRONG": 3}
BAND_FLOOR = {"BUILDING": 0, "FAIR": 40, "GOOD": 60, "STRONG": 80}
FAIR_CAP_PAISE = 500000          # ₹5,000
LOW_CONFIDENCE_CAP_PAISE = 300000  # ₹3,000
REVIEW_MARGIN = 5
STEP_PAISE = 10000               # amounts are whole ₹100s
ELIGIBLE_RANK = {"ELIGIBLE": 0, "NEEDS_REVIEW": 1, "OUTSIDE": 2}


def default_tenure(tenures: list[int]) -> int:
    """26 weeks if offered, else the closest allowed tenure (shorter wins a tie)."""
    if 26 in tenures:
        return 26
    return min(tenures, key=lambda t: (abs(t - 26), t))


def match_offers(score_result: dict, afford: dict, lenders: list[dict], products: list[dict],
                 requested_paise: int) -> list[dict]:
    score = score_result.get("score")
    band = score_result.get("band")
    conf = score_result.get("confidence")
    weeks_observed = score_result.get("weeks_observed", 0)
    safe = afford.get("safe_weekly_paise") or 0

    # Step 1 (+ §4: no surplus in a bad week means no loans).
    if score is None or conf == "NONE" or band in (None, "BUILDING") or safe <= 0:
        return []

    lenders_by_id = {l["id"]: l for l in lenders}
    offers = []
    for p in products:
        if p.get("kind", "LOAN") != "LOAN":
            continue
        lender = lenders_by_id.get(p["lender_id"])
        if lender is None:
            continue
        weeks = default_tenure(list(p["tenures"]))

        # Step 2: lender floor.
        eligible, reason = None, None
        if BAND_ORDER[band] < BAND_ORDER[lender["min_band"]]:
            eligible, reason = "OUTSIDE", "BAND_BELOW_MIN"
        elif weeks_observed < lender["min_weeks"]:
            eligible, reason = "OUTSIDE", "TOO_FEW_WEEKS"

        # Steps 3–4: amount and caps.
        cap = loan_max(safe, p["rate_pct"], weeks)
        amount = min(requested_paise, p["max_paise"], cap)
        if lender.get("max_amount_paise"):
            amount = min(amount, lender["max_amount_paise"])
        if band == "FAIR":
            amount = min(amount, FAIR_CAP_PAISE)
        if conf == "MEDIUM":
            amount = min(amount, cap // 2)
        elif conf == "LOW":
            amount = min(amount, LOW_CONFIDENCE_CAP_PAISE)
        amount = max(0, amount // STEP_PAISE * STEP_PAISE)

        # Step 5: product minimum.
        if eligible is None and amount < p["min_paise"]:
            eligible, reason = "OUTSIDE", "BELOW_MIN_AMOUNT"

        # Step 6: borderline or medium confidence goes to a human.
        if eligible is None:
            borderline = score - BAND_FLOOR[lender["min_band"]] <= REVIEW_MARGIN
            eligible = "NEEDS_REVIEW" if borderline or conf == "MEDIUM" else "ELIGIBLE"

        # Step 7: cost card.
        card = kfs(amount, p["rate_pct"], p["fee_pct"], weeks)
        offers.append({
            "lender": {"id": lender["id"], "name": lender["name"]},
            "product_id": p["id"],
            "amount_paise": amount,
            "weeks": weeks,
            "frequency": "WEEKLY",
            "rate_pct": p["rate_pct"],
            "fee_pct": p["fee_pct"],
            "kfs": card,
            "fits_safe_instalment": amount > 0 and card["instalment_paise"] <= safe,
            "eligible": eligible,
            "reason": reason,
        })

    offers.sort(key=lambda o: (ELIGIBLE_RANK[o["eligible"]], o["kfs"]["apr_pct"]))
    return offers
