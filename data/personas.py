"""Synthetic persona parameters (PRODUCT §4, CONTRACTS §7). All names, platforms, banks and lenders are fictional.

Amounts are rupees. Day-level behaviour is simulated by generate_personas.py with a seeded RNG.
Weekday numbers: 0 = Monday ... 6 = Sunday.
"""
from datetime import date

RAVI = {
    "slug": "ravi",
    "display_name": "Ravi Shinde",
    "start": date(2026, 7, 28),
    "end": date(2026, 10, 25),
    "opening_balance": 5200,
    "weekly_income": (5150, 250),
    "income_pattern": "weekly_friday",
    "income": {
        "weekday": 4, "range": (4500, 5500),
        "narration": "NEFT CR-QUICKBITE TECHNOLOGIES PVT LTD-WEEKLY PAYOUT W{week:02d}",
    },
    "tips": {"per_day": (0, 0, 1, 1, 2), "amount": (20, 80), "note": "TIP"},
    "customers": ["AMIT KULKARNI", "PRIYA DESHPANDE", "ROHAN JOSHI", "SNEHA PATWARDHAN", "KIRAN BHOSALE",
                  "NIKHIL GOKHALE", "POOJA KALE", "SAGAR NIKAM", "ANJALI SATHE", "VISHAL MORE"],
    "expense_items": [
        {"name": "fuel", "payees": ["HP PETROL PUMP KOTHRUD", "IOCL FUEL STATION", "BHARAT PETROL POINT"],
         "note": "FUEL", "amount": (110, 190), "weekdays": [0, 1, 2, 3, 4, 5]},
        {"name": "food", "payees": ["SHREE KIRANA STORES", "ANNAPURNA MESS", "JAI MALHAR DHABA", "AMRUTTULYA TEA"],
         "note": "FOOD", "amount": (70, 140), "weekdays": [0, 1, 2, 3, 4, 5, 6]},
        {"name": "family", "payees": ["LAXMI SHINDE"], "note": "HOME", "amount": (800, 800),
         "weekdays": [6], "every_weeks": 2, "week_offset": 0, "mandatory": True},
        {"name": "atm", "narration": "ATM CASH WDL KOTHRUD PUNE", "amount": (1000, 1000),
         "weekdays": [2], "every_weeks": 2, "week_offset": 1},
    ],
    "savings": {"amount": 200, "weeks": [0, 2, 4, 6, 8, 10, 12], "weekday": 5},  # about half the weeks
    "bills": [
        {"payee": "SURESH PATIL", "note": "RENT", "amount": (6000, 6000), "day": (4, 6),
         "late": {(2026, 10): 7}},
        {"payee": "CITY POWER BILL", "note": "ELECTRICITY", "amount": (550, 700), "day": (10, 10),
         "late": {(2026, 9): 8}},
        {"payee": "QUICKTALK MOBILE RECHARGE", "note": "PREPAID", "amount": (299, 299),
         "every_days": 28, "first": date(2026, 7, 30)},
    ],
    "extras": [
        {"date": date(2026, 9, 9), "direction": "DR", "amount": 1800,
         "payee": "SAI MOTORS GARAGE", "note": "BIKE REPAIR"},
        {"date": date(2026, 10, 13), "direction": "DR", "amount": 600, "payee": "LIFELINE CLINIC", "note": "FEVER"},
        {"date": date(2026, 10, 13), "direction": "DR", "amount": 850, "payee": "SHREE MEDICAL STORES",
         "note": "MEDICINE"},
    ],
}

SUNITA = {
    "slug": "sunita",
    "display_name": "Sunita Jadhav",
    "start": date(2026, 7, 28),
    "end": date(2026, 10, 25),
    "opening_balance": 4000,
    "weekly_income": (2900, 150),
    "income_pattern": "daily_upi",
    "income": {"weekdays": [0, 1, 2, 3, 4, 5], "customers_per_day": (6, 9), "amount": (20, 80), "note": "VEG"},
    "cash_deposits": {"weekday": 0, "amount": (500, 800), "narration": "CASH DEP MARKET YARD BRANCH"},
    "customers": ["MEERA KADAM", "SUNIL PAWAR", "ASHA SHELKE", "RAJESH KHOT", "VANDANA NAIK", "MANGESH GHULE",
                  "SHOBHA JAGTAP", "PRAKASH THORAT", "KAVITA SHIRKE", "DEEPAK MANE", "SUREKHA DHUMAL",
                  "GANESH LONDHE", "ROHINI SALVI", "SANTOSH KOLTE", "JYOTI GAVADE", "MAHESH CHAVAN",
                  "LATA KAMBLE", "VINOD SHINDE", "SEEMA BORATE", "ANIL KHARAT", "SARIKA PATOLE", "UMESH JADHAV",
                  "NEHA WAGH", "TUSHAR GAWALI", "RUPALI DESAI"],
    "expense_items": [
        {"name": "stock", "payees": ["MANDI VEG WHOLESALE"], "note": "STOCK", "amount": (200, 250),
         "weekdays": [0, 1, 2, 3, 4, 5], "mandatory": True},
        {"name": "food", "payees": ["GANESH DAIRY", "SAI KIRANA STORES"], "note": "MILK", "amount": (30, 80),
         "weekdays": [0, 2, 4, 6]},
    ],
    "savings": {"amount": 150, "probability": 1.0, "weekday": 5},
    "bills": [
        {"payee": "KAMAL GAIKWAD", "note": "RENT", "amount": (3000, 3000), "day": (3, 3), "late": {}},
        {"payee": "CITY POWER BILL", "note": "ELECTRICITY", "amount": (330, 370), "day": (12, 12), "late": {}},
        {"payee": "QUICKTALK MOBILE RECHARGE", "note": "PREPAID", "amount": (199, 199),
         "every_days": 28, "first": date(2026, 8, 2)},
    ],
    "extras": [],
}

ARJUN = {
    "slug": "arjun",
    "display_name": "Arjun Mehta",
    "start": date(2026, 7, 28),
    "end": date(2026, 10, 25),
    "opening_balance": 8000,
    "weekly_income": (9200, 4200),
    "income_pattern": "weekly_volatile",
    "income": {
        "weekday": 1,
        # one payout per week, very uneven (₹3,000–₹16,000); order is fixed so the story is reproducible
        "amounts": [9400, 15800, 3200, 6100, 12000, 4100, 15900, 8200, 3500, 11000, 9500, 7000, 14600, 9800],
        "narration": "NEFT CR-ZIPRIDE MOBILITY-DRIVER PAYOUT W{week:02d}",
    },
    "customers": [],
    "expense_items": [
        {"name": "fuel", "payees": ["BHARAT CNG STATION", "HP PETROL PUMP HADAPSAR"], "note": "CNG",
         "amount": (400, 600), "weekdays": [0, 1, 2, 3, 4, 5, 6]},
        {"name": "food", "payees": ["HIGHWAY DHABA", "NEW SAGAR HOTEL"], "note": "FOOD", "amount": (100, 200),
         "weekdays": [0, 1, 2, 3, 4, 5, 6]},
    ],
    # Arjun spends what he earns: every Sunday he withdraws whatever his balance gained that week.
    "weekly_sweep": {"weekday": 6, "narration": "ATM CASH WDL HADAPSAR PUNE"},
    "savings": None,
    "bills": [
        {"payee": "PRAKASH JOSHI", "note": "RENT", "amount": (9000, 9000), "day": (5, 5),
         "late": {(2026, 8): 9}},
        {"narration": "ACH D- ZENITH MICROFIN EMI {ref}", "amount": (2500, 2500), "day": (7, 7),
         "late": {}, "bounce": {(2026, 9): {"fee": 590, "narration": "NACH RTN CHG INSUFFICIENT BAL",
                                            "retry_after_days": 9}}},
        {"payee": "QUICKTALK MOBILE RECHARGE", "note": "PREPAID", "amount": (399, 399),
         "every_days": 28, "first": date(2026, 8, 1)},
    ],
    "extras": [
        # Round trip (gaming test): money sent to a friend and sent back 3 days later, same week.
        {"date": date(2026, 9, 21), "direction": "DR", "amount": 5000, "payee": "VIKAS SALUNKE", "note": "FRIEND"},
        {"date": date(2026, 9, 24), "direction": "CR", "amount": 5000, "payee": "VIKAS SALUNKE", "note": "BACK"},
    ],
}

MEENA = {
    "slug": "meena",
    "display_name": "Meena Pawar",
    "start": date(2026, 9, 21),
    "end": date(2026, 10, 25),
    "opening_balance": 3000,
    "weekly_income": (3500, 300),
    "income_pattern": "daily_upi",
    "income": {"weekdays": [0, 1, 2, 3, 4, 5], "customers_per_day": (1, 3), "amount": (200, 420),
               "note": "STITCHING"},
    "customers": ["SAVITA KULKARNI", "RANJANA PATIL", "MADHURI GHOLAP", "SUNANDA BHAGAT", "ALKA SONAWANE",
                  "PALLAVI DHAMALE", "SHWETA INGLE", "ARCHANA RAUT", "VAISHALI KHANDARE", "SMITA GORE"],
    "expense_items": [
        {"name": "food", "payees": ["LAXMI KIRANA STORES", "GANESH DAIRY"], "note": "GROCERY", "amount": (60, 150),
         "weekdays": [0, 1, 2, 3, 4, 5, 6]},
        {"name": "supplies", "payees": ["SHREE TAILORING SUPPLIES"], "note": "THREAD", "amount": (200, 400),
         "weekdays": [1, 4]},
        {"name": "bus", "payees": ["PMPML BUS"], "note": "BUS", "amount": (20, 40), "weekdays": [0, 3]},
    ],
    "savings": {"amount": 100, "weeks": [0, 2, 3], "weekday": 5},
    "bills": [
        {"payee": "ANITA MORE", "note": "RENT", "amount": (2500, 2500), "day": (25, 25), "late": {}},
        {"payee": "QUICKTALK MOBILE RECHARGE", "note": "PREPAID", "amount": (149, 149),
         "every_days": 28, "first": date(2026, 9, 23)},
    ],
    "extras": [],
}

PERSONAS = {p["slug"]: p for p in (RAVI, SUNITA, ARJUN, MEENA)}

# Every person name that must never appear in a masked narration (owners, customers, landlords, family, friends).
PERSON_NAMES = sorted({p["display_name"].upper() for p in PERSONAS.values()}
                      | {c for p in PERSONAS.values() for c in p["customers"]}
                      | {"SURESH PATIL", "LAXMI SHINDE", "KAMAL GAIKWAD", "PRAKASH JOSHI", "VIKAS SALUNKE",
                         "ANITA MORE"})
