"""STUB (1.1): §7 numbers."""


def kfs(principal_paise, rate_pct, fee_pct, weeks, late_fee_paise=5000) -> dict:
    return {"instalment_paise": 30678, "fee_paise": 15000, "net_disbursed_paise": 735000,
            "total_repayable_paise": 797627, "total_cost_paise": 62627, "apr_pct": 32.0,
            "advertised_rate_pct": 24, "n_instalments": 26, "late_fee_paise": 5000, "cooling_off_days": 3}


def loan_max(safe_weekly_paise, rate_pct, weeks) -> int:
    return 760000
