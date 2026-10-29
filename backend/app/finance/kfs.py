"""Weekly EMI, Key Fact Statement (true APR via IRR bisection) and loan_max (CONTRACTS §4)."""
import math

WEEKS_PER_YEAR = 52
COOLING_OFF_DAYS = 3
LOAN_STEP_PAISE = 10000  # ₹100


def _round(x: float) -> int:
    return math.floor(x + 0.5)


def weekly_rate(rate_pct: float) -> float:
    return rate_pct / 100 / WEEKS_PER_YEAR


def annuity_factor(r: float, n: int) -> float:
    """Present value of 1 paid at the end of each of n periods at rate r."""
    return float(n) if r == 0 else (1 - (1 + r) ** -n) / r


def weekly_emi(P: float, rate_pct: float, n: int) -> float:
    """Reducing-balance weekly instalment (unrounded)."""
    r = weekly_rate(rate_pct)
    if r == 0:
        return P / n
    return P * r / (1 - (1 + r) ** -n)


def weekly_irr(net: float, instalment: float, n: int, iterations: int = 200) -> float:
    """Weekly rate i in [0, 1] with instalment × annuity_factor(i, n) = net, by bisection."""
    lo, hi = 0.0, 1.0
    for _ in range(iterations):
        mid = (lo + hi) / 2
        if instalment * annuity_factor(mid, n) > net:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def kfs(principal_paise: int, rate_pct: float, fee_pct: float, weeks: int, late_fee_paise: int = 5000) -> dict:
    n = int(weeks)
    exact = weekly_emi(principal_paise, rate_pct, n) if principal_paise > 0 and n > 0 else 0.0
    instalment = _round(exact)
    total = _round(exact * n)          # the schedule's last row absorbs the per-row rounding
    fee = _round(principal_paise * fee_pct / 100)
    net = principal_paise - fee
    apr = 0.0
    if net > 0 and total > 0:
        apr = math.floor(weekly_irr(net, total / n, n) * WEEKS_PER_YEAR * 100 * 10 + 0.5) / 10
    return {
        "instalment_paise": instalment,
        "fee_paise": fee,
        "net_disbursed_paise": net,
        "total_repayable_paise": total,
        "total_cost_paise": total - net,
        "apr_pct": apr,
        "advertised_rate_pct": rate_pct,
        "n_instalments": n,
        "late_fee_paise": late_fee_paise,
        "cooling_off_days": COOLING_OFF_DAYS,
    }


def loan_max(safe_weekly_paise: int, rate_pct: float, weeks: int) -> int:
    """Largest principal whose weekly instalment fits safe_weekly, floored to ₹100."""
    if safe_weekly_paise <= 0 or weeks <= 0:
        return 0
    value = safe_weekly_paise * annuity_factor(weekly_rate(rate_pct), int(weeks))
    return int(math.floor(value / LOAN_STEP_PAISE + 1e-9)) * LOAN_STEP_PAISE
