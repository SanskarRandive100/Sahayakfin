"""Regressions for malformed statements, real PDFs, privacy and ignored corrections."""
import json
from datetime import date
from io import BytesIO

import pikepdf
import pytest

from app.ingest import IngestError, normalize, parse_statement, recategorize
from app.scoring.types import RawTxn

KEY = b"verification-only-synthetic-key"
HEADER = "date,narration,debit,credit,balance\n"


def assert_error(data, code):
    with pytest.raises(IngestError) as exc:
        parse_statement(data, "statement.bin")
    assert exc.value.code == code


@pytest.mark.parametrize("data", [b"", b"%PDF-1.7\ncorrupt", b"not a PDF"])
def test_corrupt_or_empty_statement_is_controlled(data):
    assert_error(data, "UNSUPPORTED_FILE")


@pytest.mark.parametrize("header", [
    "date,narration,debit,balance", "date,narration,credit,balance",
    "date,narration,debit,credit", "date,narration,debit,credit,balance,debit",
])
def test_csv_invalid_headers_rejected(header):
    assert_error((header + "\n2026-10-01,ATM,100,200,300,400\n").encode(), "UNSUPPORTED_FILE")


def test_csv_reordered_columns_and_dates():
    data = ("balance,credit,narration,date,debit\n"
            "900,,ATM CASH WDL,01/10/26,100 Dr\n"
            "950,50 Cr,CASH DEP,02-10-2026,\n").encode()
    result = parse_statement(data, "statement.csv")
    assert [(t.date, t.direction, t.amount, t.balance) for t in result.raw] == [
        (date(2026, 10, 1), "DR", 100, 900), (date(2026, 10, 2), "CR", 50, 950)]


@pytest.mark.parametrize("bad_row", [
    "2026-10-02,CASH DEP,,1,200.00 Cr,2200.00",  # unquoted comma shifts money columns
    "2026-10-02,ATM,100",                       # truncated row
    "2026-10-02,ATM,100,50,900",                # ambiguous direction
    "2026-10-02,ATM,invalid,50,900",
    "2026-10-02,ATM," + "9" * 400 + ",,900",   # float overflow
])
def test_bad_csv_rows_do_not_invent_transactions(bad_row):
    data = (HEADER + "2026-10-01,ATM,100,,900\n" + bad_row + "\n").encode()
    result = parse_statement(data, "statement.csv")
    assert len(result.raw) == 1
    assert result.warnings == ["Skipped CSV line 3: could not read it."]


def test_csv_broken_quoting_is_controlled():
    data = (HEADER + '2026-10-01,"unfinished,100,,900\n').encode()
    assert_error(data, "NO_TRANSACTIONS")


@pytest.mark.parametrize("transactions", [1, True, "bad", {"valueDate": "2026-10-01"}])
def test_aa_transactions_must_be_a_list(transactions):
    assert_error(json.dumps({"transactions": transactions}).encode(), "UNSUPPORTED_FILE")


@pytest.mark.parametrize("amount", [float("nan"), float("inf"), -float("inf"), True, 10 ** 400],
                         ids=["nan", "infinity", "negative-infinity", "boolean", "overflow"])
def test_aa_invalid_numeric_rows_skipped(amount):
    row = {"valueDate": "2026-10-01", "narration": "CASH DEP", "type": "CREDIT", "amount": amount}
    valid = dict(row, amount=100, currentBalance=1000)
    result = parse_statement(json.dumps({"transactions": [row, valid]}).encode(), "statement.json")
    assert len(result.raw) == 1 and result.raw[0].amount == 100
    assert len(result.warnings) == 1
    assert normalize(result.raw, None, KEY)[0].amount_paise == 10000


@pytest.mark.parametrize("pages,code", [(1, "NO_TRANSACTIONS"), (21, "TOO_MANY_PAGES")])
def test_real_blank_pdf_page_limits(pages, code):
    buf = BytesIO()
    with pikepdf.new() as pdf:
        for _ in range(pages):
            pdf.add_blank_page()
        pdf.save(buf)
    assert buf.getvalue().startswith(b"%PDF-")
    assert_error(buf.getvalue(), code)


@pytest.mark.parametrize("direction", ["CR", "DR"])
def test_neft_payee_masked_in_both_directions(direction):
    raw = [RawTxn(
        date(2026, 10, 1), f"NEFT {direction}-ASHA SHELKE-RENT 9876543210", 100, direction)]
    txn = normalize(raw, None, KEY)[0]
    assert txn.payee_token and txn.payee_token in txn.narration_masked
    assert "ASHA" not in txn.narration_masked and "SHELKE" not in txn.narration_masked
    assert "9876543210" not in txn.narration_masked
    if direction == "DR":
        assert txn.category == "RENT"  # classified using the raw narration


@pytest.mark.parametrize("direction", ["CR", "DR"])
def test_self_transfer_cannot_be_revived_by_correction_chain(direction):
    raw = [RawTxn(date(2026, 10, 1), "IMPS/P2A/123456789012/RAVI SHINDE/SBIN/SELF", 5000, direction)]
    original = normalize(raw, "Ravi Shinde", KEY)[0]
    corrected = recategorize(original, "OTHER")
    corrected = recategorize(corrected, "CUSTOMER_RECEIPT" if direction == "CR" else "SAVINGS")
    assert original.category == "SELF_TRANSFER" and original.kind == "IGNORED"
    assert corrected.kind == "IGNORED" and corrected.user_corrected


def test_neft_round_trip_detected_and_stays_ignored():
    raw = [RawTxn(date(2026, 10, 1), "NEFT DR-ASHA SHELKE-TRANSFER", 5000, "DR"),
           RawTxn(date(2026, 10, 3), "NEFT CR-ASHA SHELKE-TRANSFER", 5000, "CR")]
    txns = normalize(raw, None, KEY)
    assert txns[0].payee_token == txns[1].payee_token
    assert all(t.kind == "IGNORED" and "ROUND_TRIP" in t.flags for t in txns)
    assert recategorize(txns[1], "OTHER_INCOME").kind == "IGNORED"


def test_real_pdf_reordered_columns():
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
    buf = BytesIO()
    table = Table([["Balance", "Credit", "Narration", "Date", "Debit", "Ref No"],
                   ["900.00", "", "ATM CASH WDL", "01-10-2026", "100.00 Dr", "T1"]])
    table.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 1, colors.black)]))
    SimpleDocTemplate(buf).build([table])
    result = parse_statement(buf.getvalue(), "statement.pdf")
    assert result.layout == "DEMO_BANK" and len(result.raw) == 1
    txn = result.raw[0]
    assert (txn.date, txn.amount, txn.direction, txn.balance) == (date(2026, 10, 1), 100, "DR", 900)
