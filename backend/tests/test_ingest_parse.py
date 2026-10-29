"""Parsing: sample files, locked PDFs, ALT BANK layout and bad input (tasks/02 §1.5, §2.7, §3.1)."""
import functools
import os
from pathlib import Path

import pytest

from app.ingest import IngestError, normalize, parse_statement
from app.scoring import compute_score

SAMPLES = Path(__file__).resolve().parents[2] / "data" / "samples"
KEY = b"demo-payee-hmac-key"
OWNERS = {"ravi": "Ravi Shinde", "sunita": "Sunita Jadhav", "arjun": "Arjun Mehta", "meena": "Meena Pawar"}
PASSWORDS = {"ravi": "RAVI0101", "sunita": "SUNI0101", "arjun": "ARJU0101", "meena": "MEEN0101"}

pytestmark = pytest.mark.skipif(not (SAMPLES / "ravi.csv").exists(),
                                reason="run python data/generate_personas.py first")


@functools.lru_cache(maxsize=None)
def read(name: str) -> bytes:
    return (SAMPLES / name).read_bytes()


@functools.lru_cache(maxsize=None)
def parsed(name: str, password: str | None = None):
    """Parse a sample once per test session (other test modules import this cache)."""
    return parse_statement(read(name), name, password)


@pytest.mark.parametrize("slug", list(OWNERS))
@pytest.mark.parametrize("ext", ["csv", "pdf", "aa.json"])
def test_samples_parse(slug, ext):
    r = parsed(f"{slug}.{ext}")
    assert len(r.raw) > (20 if slug == "meena" else 50)
    assert r.kind == {"csv": "CSV", "pdf": "PDF", "aa.json": "AA"}[ext]
    assert r.period_from <= r.period_to
    assert all(t.amount > 0 and t.direction in ("CR", "DR") for t in r.raw)


@pytest.mark.parametrize("slug", list(OWNERS))
def test_all_formats_agree(slug):
    raws = {ext: parsed(f"{slug}.{ext}").raw for ext in ("csv", "pdf", "aa.json")}
    rows = {ext: [(t.date, t.narration, round(t.amount, 2), t.direction, round(t.balance, 2)) for t in raw]
            for ext, raw in raws.items()}
    assert rows["csv"] == rows["pdf"] == rows["aa.json"]


def test_locked_pdf_needs_password():
    with pytest.raises(IngestError) as e:
        parse_statement(read("ravi.locked.pdf"), "ravi.locked.pdf", None)
    assert e.value.code == "PDF_PASSWORD_REQUIRED"


def test_locked_pdf_wrong_password():
    with pytest.raises(IngestError) as e:
        parse_statement(read("ravi.locked.pdf"), "ravi.locked.pdf", "WRONG0101")
    assert e.value.code == "PDF_PASSWORD_WRONG"


@pytest.mark.parametrize("slug", list(OWNERS))
def test_locked_pdf_with_password(slug):
    locked = parsed(f"{slug}.locked.pdf", PASSWORDS[slug]).raw
    plain = parsed(f"{slug}.pdf").raw
    assert locked == plain


def test_random_bytes_unsupported():
    with pytest.raises(IngestError) as e:
        parse_statement(os.urandom(2048), "x.bin", None)
    assert e.value.code == "UNSUPPORTED_FILE"


def test_plain_text_unsupported():
    with pytest.raises(IngestError) as e:
        parse_statement(b"hello world\nnot a statement", "x.txt", None)
    assert e.value.code == "UNSUPPORTED_FILE"


def test_empty_csv_has_no_transactions():
    with pytest.raises(IngestError) as e:
        parse_statement(b"date,narration,debit,credit,balance\n", "x.csv", None)
    assert e.value.code == "NO_TRANSACTIONS"


def test_duplicate_rows_are_kept():
    csv = (b"date,narration,debit,credit,balance\n"
           b"2026-10-01,UPI/DR/123456789012/SHREE KIRANA STORES/shree@ybl/FOOD,100.00,,900.00\n"
           b"2026-10-01,UPI/DR/123456789012/SHREE KIRANA STORES/shree@ybl/FOOD,100.00,,800.00\n")
    assert len(parse_statement(csv, "x.csv", None).raw) == 2


def test_malformed_csv_rows_skipped_with_warning():
    csv = (b"date,narration,debit,credit,balance\n"
           b"2026-10-01,ATM CASH WDL PUNE,500.00,,1000.00\n"
           b"not-a-date,???,abc,,\n"
           b"2026-10-02,CASH DEP BRANCH,,1,200.00 Cr,2200.00\n")
    r = parse_statement(csv, "x.csv", None)
    assert len(r.raw) >= 1 and r.warnings


def test_amount_suffixes_and_latin1_csv():
    csv = ("date,narration,debit,credit,balance\n"
           "2026-10-01,CAFÉ KIRANA,\"1,250.50 Dr\",,\"3,000.00 Cr\"\n"
           "2026-10-02,ATM CASH WDL,\"₹4,000.00\",,\"(1,000.00)\"\n").encode("utf-8")
    r = parse_statement(csv, "x.csv", None)
    assert (r.raw[0].direction, r.raw[0].amount, r.raw[0].balance) == ("DR", 1250.50, 3000.00)
    assert (r.raw[1].direction, r.raw[1].amount, r.raw[1].balance) == ("DR", 4000.00, -1000.00)
    latin = "date,narration,debit,credit,balance\n2026-10-01,CAFÉ KIRANA,100.00,,500.00\n".encode("latin-1")
    assert parse_statement(latin, "x.csv", None).raw[0].narration == "CAFÉ KIRANA"


def test_aa_json_minimal():
    doc = (b'{"account": {"masked": "XXXX4521", "type": "SAVINGS"}, "transactions": ['
           b'{"txnId": "T1", "valueDate": "2026-10-01", "narration": "ATM CASH WDL", "amount": 500, '
           b'"type": "DEBIT", "currentBalance": 1500}]}')
    r = parse_statement(doc, "x.json", None)
    assert r.kind == "AA" and r.raw[0].direction == "DR" and r.raw[0].balance == 1500


def test_alt_bank_layout_same_score():
    alt = parsed("ravi.alt.pdf")
    demo = parsed("ravi.pdf")
    assert alt.layout == "ALT_BANK" and demo.layout == "DEMO_BANK"
    s_alt = compute_score(normalize(alt.raw, "Ravi Shinde", KEY))
    s_demo = compute_score(normalize(demo.raw, "Ravi Shinde", KEY))
    assert s_alt == s_demo


def test_pdf_with_javascript_is_not_executed():
    """Sanskar's guard rejects /JavaScript earlier; the parser itself must just read tables, never run anything."""
    import pikepdf
    from io import BytesIO

    with pikepdf.open(BytesIO(read("meena.pdf"))) as pdf:
        pdf.Root.OpenAction = pdf.make_indirect(pikepdf.Dictionary(S=pikepdf.Name.JavaScript,
                                                                   JS=pikepdf.String("app.alert(1)")))
        out = BytesIO()
        pdf.save(out)
    r = parse_statement(out.getvalue(), "evil.pdf", None)
    assert len(r.raw) > 20
