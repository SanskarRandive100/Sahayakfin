"""Normalisation: categories, masking, payee tokens and gaming rules (tasks/02 §2.1, §2.2)."""
import functools
import importlib.util
import re
from datetime import date, timedelta
from pathlib import Path

import pytest

from app.ingest import IngestError, normalize, parse_statement, recategorize
from app.scoring import compute_score
from app.scoring.types import RawTxn

ROOT = Path(__file__).resolve().parents[2]
SAMPLES = ROOT / "data" / "samples"
KEY = b"demo-payee-hmac-key"
OWNERS = {"ravi": "Ravi Shinde", "sunita": "Sunita Jadhav", "arjun": "Arjun Mehta", "meena": "Meena Pawar"}

needs_samples = pytest.mark.skipif(not (SAMPLES / "ravi.csv").exists(),
                                   reason="run python data/generate_personas.py first")


def load_personas_module():
    spec = importlib.util.spec_from_file_location("personas", ROOT / "data" / "personas.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@functools.lru_cache(maxsize=None)
def raw_of(slug: str, ext: str):
    return tuple(parse_statement((SAMPLES / f"{slug}.{ext}").read_bytes(), f"{slug}.{ext}", None).raw)


def txns_of(slug: str, ext: str = "csv"):
    return normalize(list(raw_of(slug, ext)), OWNERS[slug], KEY)


def one(narration, direction="DR", amount=100.0, owner=None, d=date(2026, 10, 1)):
    return normalize([RawTxn(d, narration, amount, direction, 1000.0)], owner, KEY)[0]


# ---------------------------------------------------------------- categories, kinds, channels

@pytest.mark.parametrize("narration,direction,category,kind,channel", [
    ("NEFT CR-QUICKBITE TECHNOLOGIES PVT LTD-WEEKLY PAYOUT W40", "CR", "PLATFORM_PAYOUT", "INCOME", "NEFT"),
    ("UPI/CR/123456789012/AMIT KULKARNI/amit.k@okaxis/TIP", "CR", "CUSTOMER_RECEIPT", "INCOME", "UPI"),
    ("CASH DEP MARKET YARD BRANCH", "CR", "CASH_DEPOSIT", "INCOME", "CASH"),
    ("UPI/DR/123456789012/HP PETROL PUMP KOTHRUD/hppetrol@ybl/FUEL", "DR", "FUEL", "EXPENSE", "UPI"),
    ("UPI/DR/123456789012/SHREE KIRANA STORES/shree@ybl/FOOD", "DR", "FOOD", "EXPENSE", "UPI"),
    ("UPI/DR/123456789012/SURESH PATIL/suresh.p@okaxis/RENT", "DR", "RENT", "EXPENSE", "UPI"),
    ("UPI/DR/123456789012/CITY POWER BILL/citypower@oksbi/ELECTRICITY", "DR", "BILLS", "EXPENSE", "UPI"),
    ("UPI/DR/123456789012/QUICKTALK MOBILE RECHARGE/quicktalkm@paytm/PREPAID", "DR", "PHONE", "EXPENSE", "UPI"),
    ("ACH D- ZENITH MICROFIN EMI 004512", "DR", "EMI", "DEBT", "NACH"),
    ("NACH RTN CHG INSUFFICIENT BAL", "DR", "FEES_CHARGES", "EXPENSE", "NACH"),
    ("RD INSTALMENT TO A/C 004512345678", "DR", "SAVINGS", "SAVINGS", "OTHER"),
    ("ATM CASH WDL KOTHRUD PUNE", "DR", "CASH_WITHDRAWAL", "EXPENSE", "ATM"),
    ("UPI/DR/123456789012/SAI MOTORS GARAGE/saimotors@ybl/BIKE REPAIR", "DR", "TRANSPORT", "EXPENSE", "UPI"),
    ("UPI/DR/123456789012/LIFELINE CLINIC/lifeline@ybl/FEVER", "DR", "HEALTH", "EXPENSE", "UPI"),
    ("UPI/DR/123456789012/LAXMI SHINDE/laxmi.s@oksbi/HOME", "DR", "FAMILY", "EXPENSE", "UPI"),
    ("UPI/DR/123456789012/SHREE TAILORING SUPPLIES/shree@ybl/THREAD", "DR", "SHOPPING", "EXPENSE", "UPI"),
    ("UPI/DR/123456789012/RAMESH KUMAR/ramesh@ybl/MISC", "DR", "OTHER", "EXPENSE", "UPI"),
    ("NEFT CR-SOMEONE-MISC", "CR", "OTHER_INCOME", "INCOME", "NEFT"),
])
def test_categorise(narration, direction, category, kind, channel):
    t = one(narration, direction)
    assert (t.category, t.kind, t.channel) == (category, kind, channel)


def test_amounts_in_paise():
    assert one("ATM CASH WDL", amount=4999.99).amount_paise == 499999
    assert one("ATM CASH WDL", amount=4999.99).balance_paise == 100000


# ---------------------------------------------------------------- masking

def test_masking_of_upi_person():
    t = one("UPI/DR/123456789012/SURESH PATIL/suresh.patil@okaxis/RENT")
    assert "SURESH" not in t.narration_masked and "PATIL" not in t.narration_masked
    assert t.payee_token and re.fullmatch(r"P-[0-9A-F]{8}", t.payee_token)
    assert t.payee_token in t.narration_masked
    assert "su****@okaxis" in t.narration_masked
    assert "XXXX9012" in t.narration_masked and "RENT" in t.narration_masked


def test_business_names_survive_masking():
    t = one("NEFT CR-QUICKBITE TECHNOLOGIES PVT LTD-WEEKLY PAYOUT W40", "CR")
    assert "QUICKBITE" in t.narration_masked and t.payee_token
    t = one("UPI/DR/123456789012/CITY POWER BILL/citypower@oksbi/ELECTRICITY")
    assert "CITY POWER BILL" in t.narration_masked


def test_phone_numbers_masked():
    t = one("UPI/CR/123456789012/ASHA SHELKE/9876543210@ybl/VEG", "CR")
    assert "9876543210" not in t.narration_masked and "98****@ybl" in t.narration_masked
    t = one("IMPS P2A 9876543210 TRANSFER")
    assert "XXXXXX3210" in t.narration_masked


def test_token_is_stable_and_keyed():
    a = one("UPI/DR/123456789012/SURESH PATIL/suresh.patil@okaxis/RENT")
    b = one("UPI/DR/999999999999/Suresh  Patil/other@ybl/RENT")
    assert a.payee_token == b.payee_token
    other_key = normalize([RawTxn(date(2026, 10, 1), "UPI/DR/123456789012/SURESH PATIL/s@ybl/RENT", 10, "DR")],
                          None, b"another-key")[0]
    assert other_key.payee_token != a.payee_token


def test_owner_name_masked():
    t = one("IMPS/P2A/123456789012/RAVI SHINDE/SBIN/SELF", "CR", owner="Ravi Shinde")
    assert "RAVI" not in t.narration_masked and "SHINDE" not in t.narration_masked


@needs_samples
def test_no_sensitive_text_in_any_masked_narration():
    names = load_personas_module().PERSON_NAMES
    for slug in OWNERS:
        for ext in ("csv", "pdf", "aa.json"):
            for t in txns_of(slug, ext):
                m = t.narration_masked
                assert not re.search(r"\d{9,}", m), m
                for h in re.finditer(r"([A-Za-z0-9._\-*]*)@[a-z]+", m):
                    assert h.group(1).endswith("****") and len(h.group(1)) <= 6, m
                upper = m.upper()
                for name in names:
                    assert name not in upper, (name, m)
                    first, last = name.split()[0], name.split()[-1]
                    assert not (re.search(rf"\b{first}\b", upper) and re.search(rf"\b{last}\b", upper)), m


# ---------------------------------------------------------------- gaming and special rules

def test_self_transfer_ignored():
    t = one("IMPS/P2A/123456789012/RAVI SHINDE/SBIN/TRANSFER", "CR", owner="Ravi Shinde")
    assert t.category == "SELF_TRANSFER" and t.kind == "IGNORED"
    assert one("TRF TO OWN A/C 1234", "DR").kind == "IGNORED"
    assert one("UPI/DR/123456789012/SOMEONE/x@ybl/SELF", "DR").category == "SELF_TRANSFER"


@pytest.mark.parametrize("narration,direction", [
    ("UPI/CR/123456789012/SHREE KIRANA STORES/shree@ybl/REFUND", "CR"),
    ("REV UPI/DR/123456789012 FAILED TXN", "CR"),
    ("NEFT CR-ZENITH MICROFIN-LOAN DISB", "CR"),
])
def test_refunds_and_disbursals_ignored(narration, direction):
    t = one(narration, direction, amount=5000)
    assert t.kind == "IGNORED" and "REVERSAL" in t.flags


def test_round_trip_detected_on_synthetic_pair():
    raw = [RawTxn(date(2026, 9, 21), "UPI/DR/123456789012/VIKAS SALUNKE/vikas.s@okaxis/FRIEND", 5000, "DR"),
           RawTxn(date(2026, 9, 24), "UPI/CR/223456789012/VIKAS SALUNKE/vikas.s@okaxis/BACK", 4700, "CR"),
           RawTxn(date(2026, 9, 25), "UPI/CR/323456789012/VIKAS SALUNKE/vikas.s@okaxis/BACK", 4700, "CR")]
    out = normalize(raw, "Arjun Mehta", KEY)
    assert [t.kind for t in out] == ["IGNORED", "IGNORED", "INCOME"]   # each credit is matched once
    assert "ROUND_TRIP" in out[0].flags and "ROUND_TRIP" in out[1].flags


def test_round_trip_needs_close_amount_and_date():
    raw = [RawTxn(date(2026, 9, 1), "UPI/DR/123456789012/VIKAS SALUNKE/v@okaxis/FRIEND", 5000, "DR"),
           RawTxn(date(2026, 9, 12), "UPI/CR/223456789012/VIKAS SALUNKE/v@okaxis/BACK", 5000, "CR"),
           RawTxn(date(2026, 9, 2), "UPI/CR/223456789012/VIKAS SALUNKE/v@okaxis/BACK", 3000, "CR")]
    out = normalize(raw, None, KEY)
    assert all("ROUND_TRIP" not in t.flags for t in out)


@needs_samples
def test_arjun_round_trip_is_ignored():
    pair = [t for t in txns_of("arjun") if "ROUND_TRIP" in t.flags]
    assert len(pair) == 2
    assert {t.direction for t in pair} == {"CR", "DR"}
    assert all(t.kind == "IGNORED" for t in pair)


@needs_samples
def test_arjun_has_exactly_one_bounce():
    bounces = [t for t in txns_of("arjun") if "BOUNCE" in t.flags]
    assert len(bounces) == 1
    assert bounces[0].category == "FEES_CHARGES" and bounces[0].kind == "EXPENSE"
    assert compute_score(txns_of("arjun"))["metrics"]["bounces"] == 1


@needs_samples
def test_sunita_cash_deposits_flagged():
    cash = [t for t in txns_of("sunita") if t.category == "CASH_DEPOSIT"]
    assert len(cash) >= 12
    assert all("CASH_INCOME" in t.flags and t.kind == "INCOME" for t in cash)


def test_recategorize():
    t = one("UPI/DR/123456789012/RAMESH KUMAR/ramesh@ybl/MISC")
    r = recategorize(t, "SAVINGS")
    assert (r.category, r.kind, r.user_corrected) == ("SAVINGS", "SAVINGS", True)
    assert t.category == "OTHER"  # the original is untouched
    assert recategorize(r, "FOOD").kind == "EXPENSE"
    assert recategorize(one("CASH DEP X", "CR"), "OTHER_INCOME").flags == []
    with pytest.raises(IngestError) as e:
        recategorize(t, "LUXURY")
    assert e.value.code == "BAD_CATEGORY"


def test_recategorize_cannot_unignore_round_trip():
    raw = [RawTxn(date(2026, 9, 21), "UPI/DR/123456789012/VIKAS SALUNKE/v@okaxis/FRIEND", 5000, "DR"),
           RawTxn(date(2026, 9, 24), "UPI/CR/223456789012/VIKAS SALUNKE/v@okaxis/BACK", 5000, "CR")]
    cr = normalize(raw, None, KEY)[1]
    assert recategorize(cr, "CUSTOMER_RECEIPT").kind == "IGNORED"


@needs_samples
def test_recategorising_other_debit_to_savings_raises_savings_habit():
    txns = txns_of("arjun")  # Arjun never saves
    before = compute_score(txns)
    target = next(t for t in txns if t.category in ("FOOD", "FUEL") and t.date >= date(2026, 8, 3))
    patched = [recategorize(t, "SAVINGS") if t.id == target.id else t for t in txns]
    after = compute_score(patched)
    assert after["components"]["savings_habit"]["value"] > before["components"]["savings_habit"]["value"]
    assert after["score"] >= before["score"]


@needs_samples
@pytest.mark.parametrize("slug", list(OWNERS))
def test_aa_json_scores_like_csv(slug):
    assert compute_score(txns_of(slug, "aa.json")) == compute_score(txns_of(slug, "csv"))


@needs_samples
def test_categorised_share_high():
    for slug in OWNERS:
        assert compute_score(txns_of(slug))["metrics"]["categorised_share"] >= 0.9


def test_week_math_example():
    # A Monday-start week: Oct 19 (Mon) .. Oct 25 (Sun)
    d = date(2026, 10, 19)
    assert d.weekday() == 0 and (d + timedelta(days=6)).weekday() == 6
