"""STUB (1.1): one offer per eligibility state."""
from app.finance.kfs import kfs


def match_offers(score_result, afford, lenders, products, requested_paise) -> list[dict]:
    def offer(lid, name, pid, amt, rate, fee, elig, reason):
        return {"lender": {"id": lid, "name": name}, "product_id": pid, "amount_paise": amt, "weeks": 26,
                "frequency": "WEEKLY", "rate_pct": rate, "fee_pct": fee, "kfs": kfs(amt, rate, fee, 26),
                "fits_safe_instalment": True, "eligible": elig, "reason": reason}
    return [offer("alpha", "MFI Alpha", "alpha-weekly", 750000, 24, 2.0, "ELIGIBLE", None),
            offer("beta", "MFI Beta", "beta-flexi", 750000, 21, 1.0, "NEEDS_REVIEW", None),
            offer("gamma", "MFI Gamma", "gamma-growth", 0, 18, 1.5, "OUTSIDE", "BELOW_MIN_AMOUNT")]
