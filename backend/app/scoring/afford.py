"""STUB (1.1)."""


def affordability(txns, existing_weekly_debt_paise: int | None = None) -> dict:
    return {"safe_weekly_paise": 31100, "p25_weekly_surplus_paise": 62200, "median_weekly_surplus_paise": 90000,
            "median_weekly_income_paise": 520000, "existing_weekly_debt_paise": 0,
            "rbi_cap_weekly_paise": 260000, "payout_weekday": "FRI",
            "loan_max_paise": {"13": 380000, "26": 760000, "52": 1440000}}


def stress_test(txns, shock: float, weekly_instalment_paise: int) -> dict:
    return {"weeks_covered": 11, "weeks_total": 12, "light": "GREEN", "buffer_covers": True,
            "shortfall_paise": 0, "advice": "OK"}
