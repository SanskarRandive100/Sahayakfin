"""Ordered keyword rules -> category (CONTRACTS §2.2). First match wins; runs on the raw (unmasked) narration."""
import re
from typing import Optional

CATEGORIES = [
    "PLATFORM_PAYOUT", "CUSTOMER_RECEIPT", "CASH_DEPOSIT", "OTHER_INCOME", "FUEL", "FOOD", "RENT", "BILLS",
    "PHONE", "TRANSPORT", "FAMILY", "HEALTH", "EDUCATION", "SHOPPING", "CASH_WITHDRAWAL", "EMI", "SAVINGS",
    "FEES_CHARGES", "SELF_TRANSFER", "OTHER",
]
INCOME_CATEGORIES = {"PLATFORM_PAYOUT", "CUSTOMER_RECEIPT", "CASH_DEPOSIT", "OTHER_INCOME"}

BOUNCE_RE = re.compile(r"(?i)(NACH|ECS|ACH).*(RTN|RETURN|BOUNCE)|RETURN CHG|BOUNCE CHG")
REVERSAL_RE = re.compile(r"(?i)\bREV\b|REFUND|REVERSAL|LOAN DISB")
SELF_RE = re.compile(r"(?i)\bSELF\b|\bOWN A/?C\b")

# Words that mark a payee as a business (kept readable in the masked narration) rather than a person.
BUSINESS_WORDS = re.compile(
    r"(?i)\b(PVT|LTD|LIMITED|LLP|TECHNOLOGIES|TECH|MOBILITY|LOGISTICS|QUICKBITE|ZIPRIDE|SWIFTDROP|POWER|BILL|"
    r"ELECTRICITY|PETROL|PUMP|FUELS?|HPCL|IOCL|BPCL|CNG|KIRANA|STORES?|MART|SHOP|TRADERS|ENTERPRISES?|"
    r"WHOLESALE|MEDICAL|PHARMA|PHARMACY|CLINIC|HOSPITAL|GARAGE|MOTORS|AUTOMOBILES?|MICROFIN|FINANCE|BANK|"
    r"RECHARGE|MOBILE|TELECOM|HOTEL|DHABA|MESS|DAIRY|MILK|AGENCY|AGENCIES|CENTRE|CENTER|SERVICES|SCHOOL|"
    r"POST OFFICE|INSURANCE|VEG|GAS|WATER|CANTEEN|TEA|SWEETS|BAKERY|RESTAURANT|CAFE|TAILORS?|SUPPLY|"
    r"SUPPLIES|SUPPLIERS|BAZAAR|MARKET|CORPORATION|BOARD|MSEDCL|PREPAID)\b")

# (category, direction or None for both, regex) in the order of tasks/02 §1.5.
RULES: list[tuple[str, Optional[str], re.Pattern]] = [(c, d, re.compile(p, re.I)) for c, d, p in [
    ("FEES_CHARGES", "DR", BOUNCE_RE.pattern.replace("(?i)", "")),
    ("FEES_CHARGES", "DR", r"\bCHG\b|\bCHGS\b|\bCHARGES?\b|\bSMS ALERT\b|\bAMC\b"),
    ("SELF_TRANSFER", None, SELF_RE.pattern.replace("(?i)", "")),
    ("SAVINGS", "DR", r"\bRD\b|\bFD\b|\bSIP\b|\bGOLD\b|POST OFFICE|SAVINGS GOAL|RECURRING DEP"),
    ("EMI", "DR", r"\bEMI\b|ACH D-|NACH DR|\bLOAN\b"),
    ("PLATFORM_PAYOUT", "CR", r"PAYOUT|QUICKBITE|ZIPRIDE|SWIFTDROP"),
    ("CASH_DEPOSIT", "CR", r"CASH DEP|BY CASH"),
    ("CASH_WITHDRAWAL", "DR", r"\bATM\b|CASH WDL|\bATW\b"),
    ("RENT", "DR", r"\bRENT\b"),
    ("BILLS", "DR", r"\bPOWER\b|ELECTRICITY|\bGAS\b|\bWATER\b|\bBILLS?\b|MSEDCL"),
    ("PHONE", "DR", r"RECHARGE|PREPAID|\bMOBILE\b"),
    ("FUEL", "DR", r"PETROL|\bHPCL\b|\bIOCL\b|\bBPCL\b|\bFUELS?\b|\bCNG\b"),
    ("FOOD", "DR", r"KIRANA|GROCERY|\bHOTEL\b|\bMESS\b|DHABA|\bVEG|\bMILK\b|\bDAIRY\b|\bFOOD\b|\bTEA\b|CANTEEN"),
    ("TRANSPORT", "DR", r"\bBUS\b|METRO|\bTRAIN\b|RAILWAY|GARAGE|REPAIR|\bTYRES?\b|\bAUTO\b"),
    ("HEALTH", "DR", r"MEDICAL|PHARMA|CLINIC|HOSPITAL|MEDICINE"),
    ("EDUCATION", "DR", r"SCHOOL|\bFEES\b|TUITION|\bBOOKS?\b"),
    ("FAMILY", "DR", r"\bFAMILY\b|\bHOME\b"),
]]


def is_business(name: Optional[str]) -> bool:
    return bool(name) and bool(BUSINESS_WORDS.search(name))


def owner_tokens(owner_name: Optional[str]) -> list[str]:
    """First and last name of the account owner, uppercase (used to spot transfers to self)."""
    if not owner_name:
        return []
    parts = [p for p in re.split(r"\s+", owner_name.strip().upper()) if len(p) >= 2]
    if len(parts) >= 2:
        return [parts[0], parts[-1]]
    return parts


def mentions_owner(narration: str, owner_name: Optional[str]) -> bool:
    toks = owner_tokens(owner_name)
    if len(toks) < 2:
        return False
    text = narration.upper()
    return all(re.search(rf"\b{re.escape(t)}\b", text) for t in toks)


def categorize(narration: str, direction: str, owner_name: Optional[str] = None,
               payee_name: Optional[str] = None) -> str:
    text = narration.upper()
    for category, d, rx in RULES:
        if category == "SELF_TRANSFER" and mentions_owner(text, owner_name):
            return "SELF_TRANSFER"
        if d is not None and d != direction:
            continue
        if rx.search(text):
            return category
    if direction == "CR":
        return "CUSTOMER_RECEIPT" if text.startswith("UPI/CR") else "OTHER_INCOME"
    if text.startswith("UPI/DR") and is_business(payee_name):
        return "SHOPPING"
    return "OTHER"
