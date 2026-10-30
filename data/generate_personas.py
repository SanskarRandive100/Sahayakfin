"""Generate synthetic bank statements for the four personas (seed 42) into data/samples/.

    python data/generate_personas.py            # write <p>.csv, <p>.pdf, <p>.locked.pdf, <p>.aa.json (+ ravi.alt.pdf)
    python data/generate_personas.py --check    # also parse, normalise and score every file, print a table
    python data/generate_personas.py --layout alt   # only write ravi.alt.pdf (ALT BANK layout)

The simulation runs day by day in integer paise. The balance never goes negative: a discretionary spend is
skipped when it would, and a bill is postponed to the next day (which is how late payments can arise).
"""
import argparse
import csv
import io
import json
import os
import random
import sys
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SAMPLES = ROOT / "samples"
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT.parent / "backend"))

from personas import PERSON_NAMES, PERSONAS  # noqa: E402

SEED = 42
ACCOUNT_MASKED = "XXXX4521"
RD_ACCOUNT = "004512345678"
BANKS = ["okaxis", "oksbi", "okicici", "okhdfc", "ybl", "paytm"]


@dataclass
class Row:
    date: date
    narration: str
    debit: int   # paise
    credit: int  # paise
    balance: int  # paise
    ref: str


def password_for(persona: dict) -> str:
    return persona["display_name"].split()[0][:4].upper() + "0101"


def monday(d: date) -> date:
    return d - timedelta(days=d.weekday())


def rupees(paise: int) -> str:
    return f"{paise / 100:.2f}"


class Simulator:
    def __init__(self, persona: dict):
        self.p = persona
        self.rng = random.Random(f"{SEED}-{persona['slug']}")
        self.balance = round(persona["opening_balance"] * 100)
        self.rows: list[Row] = []
        self.pending: list[tuple[str, int]] = []   # postponed bills (narration, paise)
        self.handles: dict[str, str] = {}
        self.week0 = monday(persona["start"])

    # ------------------------------------------------------------------ narrations
    def handle(self, name: str) -> str:
        if name not in self.handles:
            bank = self.rng.choice(BANKS)
            words = name.lower().split()
            if len(words) >= 2 and self.rng.random() < 0.3:
                local = str(self.rng.choice("6789")) + "".join(self.rng.choice("0123456789") for _ in range(9))
            elif len(words) >= 2:
                local = f"{words[0][:8]}.{words[1][0]}"
            else:
                local = words[0][:10]
            self.handles[name] = f"{local}@{bank}"
        return self.handles[name]

    def business_handle(self, name: str) -> str:
        if name not in self.handles:
            self.handles[name] = "".join(name.lower().split())[:10] + "@" + self.rng.choice(BANKS)
        return self.handles[name]

    def upi(self, direction: str, name: str, note: str) -> str:
        ref = "".join(self.rng.choice("0123456789") for _ in range(12))
        h = self.handle(name) if name in PERSON_NAMES else self.business_handle(name)
        return f"UPI/{direction}/{ref}/{name}/{h}/{note}"

    def ref(self) -> str:
        return f"{self.p['slug'][:2].upper()}{len(self.rows) + 1:06d}"

    # ------------------------------------------------------------------ ledger
    def credit(self, d: date, narration: str, amount: int) -> None:
        self.balance += amount
        self.rows.append(Row(d, narration, 0, amount, self.balance, self.ref()))

    def debit(self, d: date, narration: str, amount: int, mandatory: bool = False) -> bool:
        if amount <= 0:
            return False
        if amount > self.balance:
            if mandatory:
                self.pending.append((narration, amount))
            return False
        self.balance -= amount
        self.rows.append(Row(d, narration, amount, 0, self.balance, self.ref()))
        return True

    def amount(self, rng_range, paise_noise: bool = False) -> int:
        lo, hi = rng_range
        rupee = self.rng.randint(int(lo), int(hi))
        return rupee * 100 + (self.rng.randint(0, 99) if paise_noise and lo != hi else 0)

    # ------------------------------------------------------------------ schedule of bills
    def bill_events(self) -> dict[date, list[tuple[str, int, str]]]:
        """date -> [(narration, paise, kind)] where kind is 'bill' or 'bounce_fee'."""
        start, end = self.p["start"], self.p["end"]
        events: dict[date, list] = {}

        def add(d, item):
            if start <= d <= end:
                events.setdefault(d, []).append(item)

        for b in self.p["bills"]:
            def narration():
                if "narration" in b:
                    return b["narration"].format(ref=f"{self.rng.randint(100000, 999999)}")
                return self.upi("DR", b["payee"], b["note"])
            if "every_days" in b:
                d = b["first"]
                while d <= end:
                    add(d, (narration(), self.amount(b["amount"]), "bill"))
                    d += timedelta(days=b["every_days"])
                continue
            y, m = start.year, start.month
            while date(y, m, 1) <= end:
                due = date(y, m, self.rng.randint(*b["day"]))
                amt = self.amount(b["amount"], paise_noise=True)
                bounce = b.get("bounce", {}).get((y, m))
                if bounce:
                    add(due, (bounce["narration"], bounce["fee"] * 100, "bounce_fee"))
                    add(due + timedelta(days=bounce["retry_after_days"]), (narration(), amt, "bill"))
                else:
                    add(due + timedelta(days=b.get("late", {}).get((y, m), 0)), (narration(), amt, "bill"))
                y, m = (y + 1, 1) if m == 12 else (y, m + 1)
        return events

    # ------------------------------------------------------------------ main loop
    def run(self) -> list[Row]:
        p, rng = self.p, self.rng
        bills = self.bill_events()
        extras: dict[date, list] = {}
        for e in p.get("extras", []):
            extras.setdefault(e["date"], []).append(e)
        income = p["income"]
        saved_weeks: dict[int, bool] = {}
        sweep = p.get("weekly_sweep")
        prev_close = self.balance

        d = p["start"]
        while d <= p["end"]:
            week = (monday(d) - self.week0).days // 7
            wd = d.weekday()
            iso_week = d.isocalendar()[1]

            # 1. income
            pattern = p["income_pattern"]
            if pattern == "weekly_friday" and wd == income["weekday"]:
                mean, sd = p["weekly_income"]
                lo, hi = income["range"]
                amt = min(hi, max(lo, rng.gauss(mean, sd)))
                self.credit(d, income["narration"].format(week=iso_week), round(amt * 100))
            elif pattern == "weekly_volatile" and wd == income["weekday"]:
                base = income["amounts"][week % len(income["amounts"])]
                self.credit(d, income["narration"].format(week=iso_week),
                            (base + rng.randint(-150, 150)) * 100 + rng.randint(0, 99))
            elif pattern == "daily_upi" and wd in income["weekdays"]:
                for _ in range(rng.randint(*income["customers_per_day"])):
                    name = rng.choice(p["customers"])
                    self.credit(d, self.upi("CR", name, income["note"]), self.amount(income["amount"]))
            tips = p.get("tips")
            if tips:
                for _ in range(rng.choice(tips["per_day"])):
                    name = rng.choice(p["customers"])
                    self.credit(d, self.upi("CR", name, tips["note"]), self.amount(tips["amount"]))
            cash = p.get("cash_deposits")
            if cash and wd == cash["weekday"]:
                self.credit(d, cash["narration"], self.amount(cash["amount"]) // 1000 * 1000)

            # 2. extras that bring money in or must go out today
            for e in extras.get(d, []):
                narration = self.upi(e["direction"], e["payee"], e["note"])
                if e["direction"] == "CR":
                    self.credit(d, narration, e["amount"] * 100)
                else:
                    self.debit(d, narration, e["amount"] * 100, mandatory=True)

            # 3. bills postponed from earlier days, then today's bills
            waiting, self.pending = self.pending, []
            for narration, amt in waiting:
                self.debit(d, narration, amt, mandatory=True)
            for narration, amt, kind in bills.get(d, []):
                self.debit(d, narration, amt, mandatory=True)

            # 4. savings
            s = p.get("savings")
            if s and wd == s["weekday"]:
                do_save = (week in s["weeks"]) if "weeks" in s else rng.random() < s["probability"]
                if do_save and not saved_weeks.get(week):
                    if self.debit(d, f"RD INSTALMENT TO A/C {RD_ACCOUNT}", s["amount"] * 100):
                        saved_weeks[week] = True

            # 5. day-to-day spending
            for item in p["expense_items"]:
                if wd not in item["weekdays"]:
                    continue
                if "every_weeks" in item and week % item["every_weeks"] != item.get("week_offset", 0):
                    continue
                amt = self.amount(item["amount"], paise_noise=item["amount"][0] != item["amount"][1])
                if "narration" in item:
                    narration = item["narration"]
                else:
                    payee = rng.choice(item["payees"])
                    narration = self.upi("DR", payee, item["note"])
                self.debit(d, narration, amt, mandatory=item.get("mandatory", False))

            # 6. Arjun-style weekly sweep: withdraw whatever the balance gained this week
            if sweep and wd == sweep["weekday"]:
                gain = self.balance - prev_close
                if gain >= 10000:
                    self.debit(d, sweep["narration"], gain // 10000 * 10000)
            if wd == 6:
                prev_close = self.balance
            d += timedelta(days=1)
        return self.rows


def simulate(slug: str) -> list[Row]:
    return Simulator(PERSONAS[slug]).run()


# ---------------------------------------------------------------------- writers

def csv_bytes(rows: list[Row]) -> bytes:
    out = io.StringIO()
    w = csv.writer(out, lineterminator="\n")
    w.writerow(["date", "narration", "debit", "credit", "balance"])
    for r in rows:
        w.writerow([r.date.isoformat(), r.narration, rupees(r.debit) if r.debit else "",
                    rupees(r.credit) if r.credit else "", rupees(r.balance)])
    return out.getvalue().encode("utf-8")


def aa_bytes(rows: list[Row], slug: str) -> bytes:
    doc = {
        "account": {"masked": ACCOUNT_MASKED, "type": "SAVINGS"},
        "transactions": [{"txnId": f"{slug.upper()}{i + 1:06d}", "valueDate": r.date.isoformat(),
                          "narration": r.narration, "amount": (r.debit or r.credit) / 100,
                          "type": "DEBIT" if r.debit else "CREDIT", "currentBalance": r.balance / 100}
                         for i, r in enumerate(rows)],
    }
    return json.dumps(doc, indent=1).encode("utf-8")


def pdf_bytes(rows: list[Row], persona: dict, layout: str = "demo") -> bytes:
    from reportlab import rl_config
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.pdfbase.pdfmetrics import stringWidth
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    rl_config.invariant = 1  # same bytes on every run
    styles = getSampleStyleSheet()
    buf = io.BytesIO()
    bank = "DEMO BANK" if layout == "demo" else "ALT BANK"
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=28, rightMargin=28, topMargin=28, bottomMargin=28,
                            title=f"{bank} statement", author=bank)
    start, end = rows[0].date, rows[-1].date
    story = [
        Paragraph(bank, styles["Title"]),
        Paragraph(f"Statement of account: {persona['display_name']}", styles["Normal"]),
        Paragraph(f"Account: {ACCOUNT_MASKED} (Savings)", styles["Normal"]),
        Paragraph(f"Period: {start:%d-%m-%Y} to {end:%d-%m-%Y}", styles["Normal"]),
        Spacer(1, 8),
    ]
    money = lambda p: f"{p / 100:,.2f}" if p else ""  # noqa: E731
    if layout == "demo":
        header = ["Date", "Narration", "Ref No", "Debit", "Credit", "Balance"]
        body = [[r.date.strftime("%d-%m-%Y"), r.narration, r.ref, money(r.debit), money(r.credit),
                 f"{r.balance / 100:,.2f}"] for r in rows]
        widths = [48, 305, 44, 46, 46, 50]
        text_col = 1
    else:
        header = ["Txn Date", "Value Date", "Description", "Withdrawal", "Deposit", "Balance"]
        body = [[r.date.strftime("%d/%m/%y"), r.date.strftime("%d/%m/%y"), r.narration, money(r.debit),
                 money(r.credit), f"{r.balance / 100:,.2f}"] for r in rows]
        widths = [40, 40, 309, 50, 50, 50]
        text_col = 2
    widest = max(stringWidth(row[text_col], "Helvetica", 7) for row in body)
    font = min(7.0, 7.0 * (widths[text_col] - 6) / widest)
    table = Table([header] + body, colWidths=widths, repeatRows=1)
    table.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, -1), "Helvetica", font),
        ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 7),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8e8e8")),
        ("ALIGN", (-3, 1), (-1, -1), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 1.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5),
    ]))
    story.append(table)
    doc.build(story)
    return buf.getvalue()


def lock_pdf(data: bytes, password: str) -> bytes:
    import pikepdf

    out = io.BytesIO()
    with pikepdf.open(io.BytesIO(data)) as pdf:
        pdf.save(out, encryption=pikepdf.Encryption(owner=password, user=password, R=6))
    return out.getvalue()


def write_all(only_alt: bool = False) -> list[Path]:
    SAMPLES.mkdir(parents=True, exist_ok=True)
    written = []
    for slug, persona in PERSONAS.items():
        rows = simulate(slug)
        files = {}
        if not only_alt:
            pdf = pdf_bytes(rows, persona)
            files = {f"{slug}.csv": csv_bytes(rows), f"{slug}.pdf": pdf, f"{slug}.aa.json": aa_bytes(rows, slug)}
            # Encryption salts are random: keep the old locked file when the plain PDF has not changed.
            plain, locked = SAMPLES / f"{slug}.pdf", SAMPLES / f"{slug}.locked.pdf"
            if not (locked.exists() and plain.exists() and plain.read_bytes() == pdf):
                files[locked.name] = lock_pdf(pdf, password_for(persona))
        if slug == "ravi":
            files[f"{slug}.alt.pdf"] = pdf_bytes(rows, persona, layout="alt")
        for name, content in files.items():
            path = SAMPLES / name
            path.write_bytes(content)
            written.append(path)
    return written


# ---------------------------------------------------------------------- check

def check() -> int:
    from app.ingest import normalize, parse_statement
    from app.scoring import affordability, compute_score

    key = os.environ.get("PAYEE_HMAC_KEY", "demo-payee-hmac-key").encode()
    print(f"{'persona':8} {'file':18} {'rows':>5} {'monthly Rs':>10} {'score':>5} {'band':8} {'conf':6} "
          f"{'weeks':>5} {'safe/wk Rs':>9} {'loan26 Rs':>9}")
    failures = []
    for slug, persona in PERSONAS.items():
        baseline = None
        names = [f"{slug}.csv", f"{slug}.pdf", f"{slug}.locked.pdf", f"{slug}.aa.json"]
        if (SAMPLES / f"{slug}.alt.pdf").exists():
            names.append(f"{slug}.alt.pdf")
        for name in names:
            data = (SAMPLES / name).read_bytes()
            pw = password_for(persona) if "locked" in name else None
            parsed = parse_statement(data, name, pw)
            txns = normalize(parsed.raw, persona["display_name"], key)
            s = compute_score(txns)
            a = affordability(txns)
            # Compare the actual parsed rows and outputs, not only a printed score table.
            rows = [(r.date, r.narration, r.amount, r.direction, r.balance) for r in parsed.raw]
            current = (rows, s, a)
            if baseline is None:
                baseline = current
            elif current != baseline:
                failures.append(f"{name}: transactions, score or affordability differ from {slug}.csv")
            monthly = s["metrics"]["median_weekly_income_paise"] * 52 / 12 / 100
            print(f"{slug:8} {name:18} {len(parsed.raw):5d} {monthly:10,.0f} {str(s['score']):>5} "
                  f"{str(s['band']):8} {s['confidence']:6} {s['weeks_observed']:5d} "
                  f"{a['safe_weekly_paise'] / 100:9,.2f} {a['loan_max_paise']['26'] / 100:9,.0f}")
        comps = {k: v["value"] for k, v in s["components"].items()}
        print(f"         components {comps}  reasons {[r['code'] for r in s['reasons']]}")
    for failure in failures:
        print(f"MISMATCH: {failure}")
    print(f"Format equivalence: {'FAIL' if failures else 'PASS'} ({len(failures)} mismatches)")
    return 1 if failures else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true", help="parse, normalise and score every sample")
    ap.add_argument("--layout", choices=["demo", "alt"], default=None, help="'alt' writes only ravi.alt.pdf")
    args = ap.parse_args()
    written = write_all(only_alt=args.layout == "alt")
    print(f"wrote {len(written)} files to {SAMPLES}")
    if args.check:
        return check()
    return 0


if __name__ == "__main__":
    sys.exit(main())
