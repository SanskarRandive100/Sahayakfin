# Rajat: Scoring engine, statement parsing, loan maths and demo data

## Your role in one paragraph

You build the brain of SahayakFin: the code that reads a bank statement, cleans and masks it, computes the Financial Trust Score, works out a safe loan, and proves the score is fair. This is **"Algorithm Fairness & Logic", 30% of the marks.** Your code is **pure Python**: no FastAPI, no database. Sanskar's API imports your functions (CONTRACTS §4.1). Mihir never calls you directly.

**You own:**
- `backend/app/ingest/**`, `backend/app/scoring/**`, `backend/app/finance/**`
- `backend/tests/test_ingest*.py`, `test_scoring*.py`, `test_finance*.py`, `test_fairness*.py`
- `data/**`, `docs/ALGORITHM.md`, this file

**Never edit:** `backend/app/api/**`, `backend/app/*.py` (except reading), `frontend/**`.

**Sync:** `bash scripts/sync.sh scoring "scoring: <what>"`. It runs `python -m pytest -q` before pushing.

**Plain-language glossary:**
- **Percentile P25:** sort the weekly incomes; P25 is the value a quarter of weeks fall below, i.e. "a typical bad week".
- **Median (P50):** the middle value, i.e. "a normal week".
- **Unit test:** a tiny program that checks a function returns the expected number.
- **Golden vector:** a fixed input with a known correct answer (CONTRACTS §7).
- **HMAC:** a keyed fingerprint. The same name always gives the same token, but the token can't be turned back into the name.
- **IRR:** the interest rate that makes the money you receive equal to the instalments you pay. We use it to find the true APR.

## Your timeline

| Phase | Time | You deliver |
| --- | --- | --- |
| 0 | 22:50–23:05 | Setup; read the contracts |
| 1 | 23:05–00:30 | Stubs (23:20) → engine + golden tests (23:45) → finance (00:00) → sample data (00:10) → CSV + PDF parsing (00:25) → persona sanity check |
| Review 1 | 00:30–00:50 | Watch the demo; note scoring/data issues |
| 2 | 00:50–02:15 | Full normalise (masking, gaming rules), AA JSON, recategorise, affordability + stress, wellness + nudges, what-if, fairness report, persona tuning |
| 3 | 02:15–02:55 | ALT BANK layout, ALGORITHM.md draft, Demo 2, night prompt |
| 4 | 03:00–07:00 | Night shift (Claude alone) |
| 5 | 07:00–08:00 | Merge, final numbers for the pitch |

## Target folder layout (create exactly this)

```
backend/app/ingest/
  __init__.py      # exports parse_statement, normalize, recategorize, IngestError
  errors.py        # class IngestError(Exception): code: str, message: str
  sniff.py         # detect PDF / CSV / AA JSON from bytes + filename
  pdf_parser.py    # pdfplumber tables (+ pikepdf decrypt in memory); DEMO BANK, later ALT BANK
  csv_parser.py
  aa_parser.py
  categorize.py    # ordered keyword rules → category
  mask.py          # masking + HMAC payee tokens
  normalize.py     # RawTxn -> Txn: category, kind, channel, flags, round trip, bounce, self transfer
backend/app/scoring/
  __init__.py      # exports compute_score, score_from_weekly, what_if, affordability, stress_test,
                   #         weekly_breakdown, nudges, fairness_report
  types.py         # RawTxn, Txn (CONTRACTS §2.1), WeekFeature
  weekly.py        # window selection + weekly aggregation + bill detection + smoothing
  engine.py        # components, FTS, band, confidence, reasons, tips, score_from_weekly, compute_score
  afford.py        # affordability, stress_test
  wellness.py      # weekly_breakdown, nudges
  fairness.py      # what_if, fairness_report
backend/app/finance/
  __init__.py      # exports kfs, loan_max, match_offers, schedule
  kfs.py           # emi, kfs, apr via bisection, loan_max
  offers.py        # match_offers
  schedule.py      # schedule
data/
  personas.py      # persona parameters (one dict per persona)
  generate_personas.py
  samples/         # generated: <p>.csv, <p>.pdf, <p>.locked.pdf, <p>.aa.json (+ ravi.alt.pdf in Phase 3)
backend/tests/
  test_scoring_golden.py, test_finance.py, test_ingest_parse.py, test_ingest_normalize.py,
  test_scoring_personas.py, test_fairness.py
```

---

## Phase 0: Setup (22:50 → 23:05)

- [x] Clone the repo, set `git config user.name/email`, run `bash scripts/setup-dev.sh`.
- [x] Set up Python:
  ```bash
  cd backend && python -m venv .venv
  source .venv/bin/activate          # Windows: .venv\Scripts\activate
  pip install -r requirements.txt
  ```
- [x] Start `claude` at the repo root.

---

## Phase 1: First Demo build (23:05 → 00:30)

**Paste this prompt:**

```
I am Rajat. I own ingest, scoring, finance and synthetic data for SahayakFin (docs/CONTRACTS.md §0).
Read CLAUDE.md, ALL of docs/CONTRACTS.md (source of truth), docs/PRODUCT.md §4, docs/TEAM_PLAN.md and tasks/02_RAJAT_SCORING.md (Phase 1 and the target folder layout).
Do Phase 1 items 1.1 → 1.6 in order. For each: implement exactly as specified, write the listed tests, run `cd backend && python -m pytest -q`, tick the box in my task file, commit only my paths with a short message (no AI attribution, ever).
After 1.1, 1.4 and 1.5 run `bash scripts/sync.sh scoring "<message>"` immediately because Sanskar depends on them.
Rules: numpy.percentile default interpolation; paise ints at function boundaries; round-half-up = floor(x+0.5); never edit outside my paths; if something in the contract is impossible, stop and tell me instead of improvising.
```

### 1.1 Interface stubs: push by 23:20 ✅

Sanskar can't import anything until these exist.

- `scoring/types.py`:
  - `RawTxn` and `Txn` exactly as in CONTRACTS §2.1.
  - `@dataclass WeekFeature(week_start: date, income: float, expense: float, debt: float, saved: bool, expense_fixed: float, expense_flex: float, closing_balance: float | None)`. All amounts are rupees.
- Every function in CONTRACTS §4.1 must exist with the exact signature and return contract-shaped placeholder data:
  - `compute_score` → the §3.1 example dict.
  - `parse_statement` → `ParseResult` with 20 fake RawTxn over 3 weeks.
  - `normalize` → Txn list (category OTHER, kind from direction).
  - `kfs` → the §7 KFS numbers.
  - `match_offers` → 3 offers (ELIGIBLE / NEEDS_REVIEW / OUTSIDE).
  - `schedule` → 26 weekly rows.
- `ingest/errors.py`: `class IngestError(Exception)` with `.code` and `.message`.
- **Acceptance:** from `backend/`, this prints `ok`:
  ```bash
  python -c "from app.ingest import parse_statement, normalize, recategorize, IngestError; from app.scoring import compute_score, affordability, stress_test, weekly_breakdown, nudges, what_if, fairness_report, score_from_weekly; from app.finance import kfs, loan_max, match_offers, schedule; print('ok')"
  ```
- **Sync and post in chat:** "stubs on main".

### 1.2 Scoring engine + golden tests (23:20 → 23:45) ✅

`scoring/weekly.py`:

- `select_window(txns, as_of) -> list[date]`:
  - `as_of` defaults to the max txn date.
  - Take the Mondays of complete weeks (Mon–Sun fully ≤ as_of and ≥ the first txn date), and keep the last 12.
- `detect_recurring_bills(txns, window) -> dict[payee_key, list[Txn]]`:
  - `payee_key = payee_token or category`.
  - Only DR txns in BILLS, PHONE, RENT or EMI, and only payees with ≥ 2 payments in the window.
- `bill_stats(recurring) -> (on_time, total, bounces)`:
  - `usual_day` = median day-of-month.
  - Circular day difference: `min(|d-u|, 30-|d-u|)` ≤ 5 counts as on time.
  - `bounces` = count of txns with flag `BOUNCE` in the window.
- `weekly_features(txns, as_of=None, smooth=False) -> list[WeekFeature]`:
  - Sum by kind per week.
  - `saved` rule per CONTRACTS §3: a SAVINGS txn, or balance growth ≥ max(₹20, 2% of median income).
  - `expense_fixed` = categories RENT, BILLS, PHONE, FAMILY, HEALTH, EDUCATION, FEES_CHARGES. `expense_flex` = all other expense.
  - With `smooth=True`, recurring-bill payees' totals are spread evenly over all weeks (CONTRACTS §3, "Smoothing monthly bills").

`scoring/engine.py`:

- `band(R)`, `components(I, E, saved, on_time, total, bounces, E_smooth=None)`, `fts(components)`, `band_of(score)`, `confidence(W_obs, categorised_share, cash_share)`.
- `score_from_weekly(I, E, saved, bills_on_time, bills_total, bounces, D=None)` returns the full ScoreResult dict.
  - `as_of` = None; metrics computed from the given lists.
  - `confidence` from `len(I)` with categorised_share = 1.
- `compute_score(txns, as_of=None)`:
  1. Weekly features. `I`, `E` unsmoothed for stability and R; smoothed `E` for W_surplus.
  2. Bill stats.
  3. Categorised share = value share of non-IGNORED txns whose category is not OTHER.
  4. Cash share = CASH_DEPOSIT ÷ total income.
  5. Components → FTS → score (round-half-up) → band → confidence → reasons → tips → metrics.
- **Reasons and tips exactly as CONTRACTS §3.** Tips re-run `score_from_weekly` with the modified weekly lists.
- `engine_version = "fts-2.0"`.
- `metrics.weekly` (website charts C3 and C8): one entry per window week, oldest first, `{week_start, income_paise, expense_paise (unsmoothed), surplus_paise (smoothed), saved}`. Test: its length equals `weeks_observed`. ✅

`tests/test_scoring_golden.py`:
- Vectors A, B, C, D and Scale; band(R) at 0.85, 1.00, 1.20 and 1.35; Reasons A and B with tip points.
- Tolerances ±0.01 on components and FTS.
- Also test: `P50 ≤ 0` → score None and confidence NONE; `W_obs = 3` → NONE.

**Acceptance:** `python -m pytest -q tests/test_scoring_golden.py` all green.

### 1.3 Finance (23:45 → 00:00) ✅

`finance/kfs.py`:
- `weekly_emi(P, rate_pct, n)`: `r = rate_pct/100/52`; if r == 0, return P/n.
- `kfs(...)` per CONTRACTS §4. Paise rounding: instalment rounded to the nearest paisa; total = instalment × n.
- APR by bisection on the weekly rate in [0, 1] for 200 iterations, × 52 × 100, rounded to 0.1.
- `loan_max(safe_weekly_paise, rate_pct, weeks)`: the annuity formula, floored to ₹100 (10000 paise). safe ≤ 0 returns 0.

`finance/schedule.py`:
- `schedule(principal_paise, rate_pct, weeks, start, payout_weekday)`.
- The first due date is the first `payout_weekday` on or after `start + 7 days`, then every 7 days.
- Each row's amount is the instalment. The **last** row absorbs rounding so that the total equals `instalment × n`.

`finance/offers.py`:
- `match_offers(...)` exactly per CONTRACTS §4, steps 1–7.
- Lenders and products come in as plain dicts in the §4.2 shape: lender `{id, name, min_band, min_weeks}`; product `{id, lender_id, kind, name, min_paise, max_paise, rate_pct, fee_pct, tenures}`.
- Default tenure is 26 if allowed, else the closest. Band order: BUILDING < FAIR < GOOD < STRONG.

`tests/test_finance.py`:
- §7 finance checks.
- schedule weekday: start Thu 2026-10-29, payout FRI → first due Fri 2026-11-06.
- match_offers cases:
  - STRONG/HIGH → Gamma eligible when the amount allows.
  - FAIR → only Alpha, capped at ₹5,000.
  - BUILDING → no loans.
  - LOW confidence → cap ₹3,000.
  - safe_weekly 0 → no loans.

**Sync.**

### 1.4 Synthetic data (00:00 → 00:10) ✅

Start this earlier if you can, for example by asking Claude to write it right after 1.1.

`data/personas.py` holds one dict per persona: `slug`, `display_name` (CONTRACTS §1 names), `start`, `end`, `weekly_income` (mean, sd), `income_pattern` ("weekly_friday" / "daily_upi" / "weekly_volatile"), `expense_items` (list of dicts), `savings` (amount, probability per week), `bills` (list with day-of-month, amount, `late_prob`), `extras` (bounce, round trip, cash deposits, existing EMI). The CONTRACTS §7 ranges are the targets.

| Persona | Income pattern | Spending | Savings | Bills | Extras |
| --- | --- | --- | --- | --- | --- |
| **Ravi Shinde** (Jul 28 → Oct 25) | NEFT "QUICKBITE TECHNOLOGIES PVT LTD-WEEKLY PAYOUT Wnn" every **Friday**, ₹4,500–₹5,500; 0–2 UPI tips a day, ₹20–₹80 | fuel ₹120–₹220 on 6 days a week (HP / IOCL petrol pump names); kirana/food ₹80–₹180 daily; family transfer ₹800 every second week | RD ₹200 in about half the weeks | rent ₹6,000 to "SURESH PATIL RENT" on day 4–6; CITY POWER BILL ₹550–₹700 on day ~10; MOBILE RECHARGE ₹299 every 28 days | one bike repair at a GARAGE for ₹1,800 in week 6; ATM ₹1,000 twice a month |
| **Sunita Jadhav** | daily UPI/CR from 6–15 different customers, ₹20–₹150 each (~₹400/day, 6 days a week); CASH DEP ₹500–₹800 every Monday | stock purchase "MANDI VEG WHOLESALE" ₹250 daily; food | RD ₹150 **every** week | rent ₹3,000 on day 3; electricity ₹350; recharge ₹199, all on time | |
| **Arjun Mehta** | NEFT "ZIPRIDE MOBILITY-DRIVER PAYOUT" weekly, ₹3,000–₹16,000 (very uneven) | fuel/CNG ₹400–₹600 daily; food | none | existing EMI "ACH D- ZENITH MICROFIN EMI" ₹2,500 monthly on day 7 with one **NACH RTN CHG ₹590** the month it bounces; rent ₹9,000 sometimes late (+9 days); recharge | one round trip: UPI/DR ₹5,000 to "VIKAS FRIEND", UPI/CR ₹5,000 back from the same payee 3 days later |
| **Meena Pawar** (Sep 21 → Oct 25 only) | UPI receipts from tailoring customers, ~₹3,500/week | | RD ₹100 in 3 of 5 weeks | rent ₹2,500 and recharge, both on time | |

**UPI narration format:** `UPI/CR/<12 digits>/<NAME>/<handle@bank>/<note>` or `UPI/DR/...`.

**Running balance:** opening ₹3,000–₹8,000, then add/subtract each txn. Never let it go negative; skip a spend if it would.

**Outputs (seed 42) in `data/samples/`:**
- `<slug>.csv` (header `date,narration,debit,credit,balance`)
- `<slug>.pdf`: reportlab "DEMO BANK", A4, title block (bank name, customer name, masked account `XXXX4521`, period), and a 6-column table `Date | Narration | Ref No | Debit | Credit | Balance` with dates as DD-MM-YYYY. Repeat the header row on each page. Keep narrations on one line (font 7–8, wide narration column) so pdfplumber extracts cleanly.
- `<slug>.locked.pdf`: pikepdf, owner and user password `<FIRST4>0101`.
- `<slug>.aa.json` (CONTRACTS §2.5).

**`python data/generate_personas.py --check`** imports `app.scoring` (add `backend` to `sys.path`). It parses each CSV, normalises it, scores it and prints a table: persona, monthly income, score, band, confidence, safe_weekly. Tune the persona parameters until the CONTRACTS §7 ranges hold.

**Acceptance:** 16 files exist; `--check` prints values inside the ranges. (In Phase 1 the ranges can be loose because normalize is basic; tighten them in Phase 2.)

**Sync and post in chat:** "samples on main".

### 1.5 Parsing v1 (00:10 → 00:25) ✅

- `sniff.py`:
  - Starts with `%PDF-` → PDF.
  - Decodes as UTF-8 and the first line contains `date,narration` → CSV.
  - JSON with a `transactions` key → AA.
  - Else raise `IngestError("UNSUPPORTED_FILE")`.
- `pdf_parser.py`:
  - Open with `pikepdf.open(BytesIO(data), password=password or "")` → if encrypted and no password → `PDF_PASSWORD_REQUIRED`; wrong password → `PDF_PASSWORD_WRONG`.
  - Save the decrypted copy to a BytesIO; **never touch disk**.
  - `pdfplumber.open(BytesIO)`; for each page `extract_tables()`; keep rows that have a parsable date in col 0.
  - Debit/credit: strip commas, empty = 0.
  - Return RawTxn list.
- `csv_parser.py`: `csv.DictReader` on the decoded text.
- `parse_statement` returns `ParseResult(raw, kind, layout="DEMO_BANK", period_from, period_to, warnings)`. Zero rows → `NO_TRANSACTIONS`.
- `categorize.py`:
  - An ordered list of `(category, direction, regex)` rules from CONTRACTS §2.2. First match wins.
  - Order: bounce/charges → SELF_TRANSFER → SAVINGS → EMI → PLATFORM_PAYOUT → CASH_DEPOSIT → CASH_WITHDRAWAL → RENT → BILLS → PHONE → FUEL → FOOD → TRANSPORT → HEALTH → EDUCATION → FAMILY.
  - Then defaults: CR → CUSTOMER_RECEIPT if `UPI/CR`, else OTHER_INCOME. DR → SHOPPING if `UPI/DR` to a merchant, else OTHER.
- `normalize` v1: category → kind (CONTRACTS §2.3) → channel (from prefix: UPI, NEFT, ATM, ACH/NACH → NACH, CASH) → **basic masking** (digit runs and UPI handles) → paise.
- Tests (`test_ingest_parse.py`):
  - every sample CSV and PDF parses to > 50 rows (Meena > 20);
  - the locked PDF without a password raises `PDF_PASSWORD_REQUIRED`;
  - a wrong password raises `PDF_PASSWORD_WRONG`;
  - random bytes raise `UNSUPPORTED_FILE`.

**Sync. Post:** "real parsing + engine on main".

### 1.6 Persona sanity (00:25 → 00:30) ✅

Run `--check` on the PDFs too. Write the four personas' current numbers into `HANDOFF.md` under Mihir and Sanskar ("Phase 1 numbers").

**If you are behind at 00:15:** skip the PDF in 1.5. The CSV is enough for the first demo, and the locked PDF moves to the start of Phase 2. Tell the team.

---

## Review 1 (00:30 → 00:50)

Watch the flow. For your area, check:
- Do the categories look right on the Review screen?
- Is any full account number, UPI handle or name visible?
- Do the reasons make sense?
- Is the safe amount realistic?

Add lines to `REVIEW_1.md`.

**Review 1 fixes for me (copy MUST/SHOULD lines here):**
- [ ] …

---

## Phase 2: Complete the logic (00:50 → 02:15)

**Paste this prompt** (after `/clear`):

```
I am Rajat. Phase 1 is on main (check git log). Re-read CLAUDE.md, docs/CONTRACTS.md §2–§4 and §7, and Phase 2 in tasks/02_RAJAT_SCORING.md, including my "Review 1 fixes".
Do the Review 1 fixes first, then items 2.1 → 2.7 in order. For each: implement per spec, add the listed tests, run the whole backend test suite, tick the box, commit only my paths. Sync with scripts/sync.sh after 2.2, 2.4 and 2.7.
```

### 2.1 Full masking and payee tokens ✅

- **Order inside normalize:** extract payee name → categorise (needs the raw text) → mask → token.
- **Payee extraction:**
  - UPI: the 4th `/` field.
  - NEFT: the text between `CR-` and the next `-`.
  - ACH: the text after `ACH D- ` up to `EMI`/`LN`.
  - Normalise: uppercase, collapse spaces, strip `PVT LTD` and the like.
- `payee_token = "P-" + hmac.new(key, name.encode(), sha256).hexdigest()[:8].upper()`.
- **Masked narration:**
  - Replace the payee name with the token.
  - Digit runs of 9–18 → `XXXX` + last 4.
  - 10-digit phone numbers → `XXXXXX` + last 4.
  - UPI handles → first 2 chars + `****@bank`.
  - **Keep platform and biller names** (QUICKBITE, CITY POWER BILL). They are businesses, not people, and they help the user recognise rows. A simple allowlist of business keywords decides this.
- Tests: across all personas, no `narration_masked` matches `\d{9,}`, `@[a-z]+` with more than 2 visible leading chars, or any person name from `data/personas.py` (customer names, landlord, friend).

### 2.2 Gaming and special rules ✅

- **Self transfer:** owner_name tokens (first + last name) or `SELF` / `OWN A/C` in the narration → SELF_TRANSFER → IGNORED.
- **Refund / reversal** (`REV`, `REFUND`, `REVERSAL`) and loan disbursal (`LOAN DISB`) → IGNORED.
- **Round trip:** for each DR to payee X, look for a CR from X within 7 days with an amount within ±10% → both IGNORED + flag `ROUND_TRIP` (each CR is matched only once).
- **Bounce:** apply the regex from CONTRACTS §2.3 → flag `BOUNCE` (the charge stays EXPENSE / FEES_CHARGES).
- **Cash income:** CASH_DEPOSIT → flag `CASH_INCOME`.
- **AA JSON parser:** `type` DEBIT/CREDIT → direction; `currentBalance` → balance.
- `recategorize(txn, category)`: validate the category is in the allowed list (else `IngestError("BAD_CATEGORY")`), recompute kind, set `user_corrected=True`.
- Tests:
  - Arjun's round trip pair is IGNORED.
  - Arjun has exactly 1 BOUNCE.
  - Sunita's cash deposits are flagged.
  - Recategorising an OTHER debit to SAVINGS raises savings_habit when it lands in a week without savings.
  - Parsing the AA JSON gives the same score as the CSV for each persona.

### 2.3 Affordability and stress (CONTRACTS §4) ✅

- Use **smoothed** weekly features.
- `affordability(txns, existing_weekly_debt_paise=None)` returns:
  - `safe_weekly_paise`, `p25_weekly_surplus_paise`, `median_weekly_surplus_paise`, `median_weekly_income_paise`, `existing_weekly_debt_paise` (mean D_w if None), `rbi_cap_weekly_paise`
  - `payout_weekday` (MON..SUN)
  - `loan_max_paise` for "13", "26" and "52" weeks at 24%.
- `stress_test(...)` exactly per CONTRACTS §4. Flexible vs fixed comes from WeekFeature, and the current balance is the last balance.
- `stress_test` also returns `series` (the risk graph, website chart C4): `[{week_start, surplus_paise, stressed_surplus_paise}]` per window week, oldest first. `shock = 0` must be allowed (it gives the unstressed view). Test: for every week, stressed ≤ unstressed whenever shock > 0. ✅
- Tests:
  - Ravi's safe weekly is within ₹250–₹400 (tune the generator if not).
  - A stronger shock never covers more weeks (monotonic).
  - shock 0 with instalment 0 gives weeks_covered = W_obs.
  - Arjun → advice is not OK.

### 2.4 Wellness: weekly breakdown and nudges ✅

- `weekly_breakdown(txns, weeks=4)`:
  - The last `weeks` complete weeks: `{week_start, income_paise, expense_paise, by_category{CAT: paise}}`. Expense categories only; no SAVINGS, IGNORED or DEBT.
  - `avg4_by_category` = mean over those weeks.
- `nudges(txns, today, goal)`:
  - **PAYDAY_SAVE:** if the latest INCOME was within 2 days of `today` → `{amount_paise, suggest_paise}`. Suggest 10% of median weekly surplus, rounded to ₹10, minimum ₹20.
  - **CATEGORY_SPIKE:** a category in the last week is ≥ 30% above its 4-week average and ≥ ₹200 → `{category, pct}`. Report at most 1, the largest.
  - **BILL_SOON:** a recurring bill payee's usual day is within the next 3 days → `{category, day}`.
  - **GOAL_PROGRESS:** if a goal is given → `{done_weeks, total_weeks}`.
  - Never more than 3 nudges.
- Tests on Ravi with a fixed `today = 2026-10-25`.

**Sync.**

### 2.5 What-if and the fairness report ✅

- `what_if(txns, tip_code)`:
  - Compute the weekly features once, apply the tip's change (CONTRACTS §3 tips table), and re-score.
  - Return `{score_before, score_after, points}`.
  - Unknown code → `IngestError("BAD_TIP")`.
- `fairness_report(personas, hmac_key)` (personas = `{slug: {"raw": [RawTxn], "owner_name": str}}`, CONTRACTS §4.1) normalises each persona itself, runs these tests and returns `{"tests": [...], "personas": [...]}`:

| Code | How it's tested | `detail` example |
| --- | --- | --- |
| `SCALE_HALF`, `SCALE_DOUBLE` | Copy each persona's txns with amounts × 0.5 / × 2 (balances too) → same score ±0 | "Doubling every rupee for Ravi kept the score at 79." |
| `NAME_SWAP` | Re-normalise the raw data with a different owner_name and every person name replaced (e.g. "RAVI SHINDE" → "IMRAN SHAIKH", "SURESH PATIL" → "JOHN DSOUZA") → same score | "Changing every name in Ravi's statement kept the score at 79." |
| `STEADY_BEATS_RICH` | Sunita's score > Arjun's | Includes both monthly incomes |
| `MONOTONIC_SAVINGS` | Adding a savings week never lowers the score | |
| `MONOTONIC_BILLS` | Making a late bill on time never lowers the score | |
| `MISSING_IS_NOT_BAD` | Removing all bills → bill_discipline unavailable, not 0; the score changes by < 5 points for Sunita | |
| `NO_PROTECTED_INPUTS` | Static check: the engine's inputs are only Txn fields; list the fields used | |

  - Each test entry: `{code, passed, detail}`. `detail` is one plain-English sentence with real numbers.
  - Each persona entry: `{name, monthly_income_paise, score, band, confidence}`.
- `tests/test_fairness.py`: every test passes on the 4 personas.


### 2.6 Persona tuning and deterministic output ✅

- Make sure the §7 ranges hold on the PDFs and the AA JSON.
- `tests/test_scoring_personas.py` asserts the ranges and the ranking Sunita > Ravi > Arjun.
- Write the final numbers into `HANDOFF.md`: score, band, confidence, safe_weekly, loan_max at 26 weeks, and the KFS for Alpha at the ₹10,000 ask.

### 2.7 Edge-case tests ✅

- An empty CSV (header only) → NO_TRANSACTIONS.
- Duplicate rows (same date, narration, amount) → kept: banks do repeat legitimate rows, so we don't dedupe.
- A zero-income week → stability still computed; R uses totals.
- A statement shorter than 4 complete weeks → score None, confidence NONE, reasons `[THIN_FILE]`, tip `ADD_MORE_HISTORY`.
- Cash share > 50% → confidence downgraded one level.

**Sync. Post:** "scoring complete (Phase 2)".

**If you are behind at 01:45:** cut 2.7, keep 2.5 (the Fairness Lab needs it), and tell Mihir and Sanskar.

---

## Phase 3: Polish + Demo 2 (02:15 → 02:55)

**Paste this prompt** (after `/clear`):

```
I am Rajat. Re-read tasks/02_RAJAT_SCORING.md Phase 3. Do 3.1 then 3.2, commit only my paths, sync.
```

- [x] **3.1 ALT BANK layout (P1).**
  - Parser support for `Txn Date | Value Date | Description | Withdrawal | Deposit | Balance` with DD/MM/YY dates. Detect it from the header row.
  - Generator flag `--layout alt` writes `ravi.alt.pdf`.
  - Test: same score as `ravi.pdf`.
- [x] **3.2 `docs/ALGORITHM.md` first draft.** Each component in plain words + formula + golden vector A worked example + fairness rules + gaming defences. (The night shift finishes it.)
- [ ] **3.3 Demo 2 at 02:45.** Watch it; write anything broken in your area as item 1 of your night prompt.
- [ ] **3.4 At 02:55:** sync, then start the night prompt.

---

## Phase 4: NIGHT prompt (start 02:55; cloud session or local, see TEAM_PLAN)

```
You are working unattended overnight on SahayakFin as Rajat's assistant. Nobody will answer until 07:00, so never wait for input; if a step is blocked after 2 attempts, write it in NIGHT_LOG_RAJAT.md and move on.
Setup: git fetch origin && git checkout -b night/rajat origin/main ; git config user.name "Rajat <SURNAME>" ; git config user.email "<RAJAT_GITHUB_EMAIL>" ; git config core.hooksPath .githooks ; cd backend && pip install -r requirements.txt && cd ..
Read CLAUDE.md, docs/CONTRACTS.md and tasks/02_RAJAT_SCORING.md. Only edit Rajat's paths (CONTRACTS §0). Never push to main. Never add AI attribution to commits.
Work in this order, committing after each item and pushing with `git push -u origin night/rajat`:
0. Fix these Demo-2 issues first: <PASTE YOUR DEMO-2 ISSUES HERE, or write "none">.
1. Any unticked Phase 1–3 items in tasks/02_RAJAT_SCORING.md.
2. Test hardening: malformed CSV rows (skip with a warning, never crash), PDF pages with no table, wrong column order, amounts with "Cr"/"Dr" suffixes, negative balances, a PDF containing "/JavaScript" (parse_statement must not execute anything; Sanskar's guard rejects it earlier, but stay safe), non-UTF8 CSV (try utf-8 then latin-1).
3. Determinism: run the persona tests 3 times; outputs must be identical. Record final persona numbers (score, band, confidence, safe_weekly, loan_max 26w, KFS Alpha ₹10,000) in NIGHT_LOG_RAJAT.md for the pitch.
4. Finish docs/ALGORITHM.md for judges: plain-language explanation of each component with its formula, golden vector A worked example, bill smoothing, confidence, reasons/tips, why rule-based not ML, fairness rules and every fairness test with the actual results, gaming defences (round trips, self transfers, cash), limitations and how we would validate weights with real repayment data. End with "Judge Q&A": 12 likely questions with crisp 2–3 sentence answers.
5. Performance: compute_score on the largest persona must run in < 200 ms; add a test.
6. Run the full backend test suite. Fix failures in Rajat's paths only; for others append to HANDOFF.md under the owner.
7. Write NIGHT_LOG_RAJAT.md: done / not done / how to verify (2 commands) / final persona numbers.
```

## Phase 5: Morning (07:00 → 08:00)

1. Read `NIGHT_LOG_RAJAT.md`.
2. Merge the night branch:
   ```bash
   git checkout main && git pull
   git merge --no-ff origin/night/rajat
   cd backend && python -m pytest -q
   git push origin main
   ```
3. Give the final persona numbers to Sanskar (pitch) and Mihir (demo script).
4. Join the final demo rehearsal. **You answer the judges' algorithm questions.** Read the Q&A in ALGORITHM.md once.

## Troubleshooting (your area)

| Symptom | Fix |
| --- | --- |
| pdfplumber returns `None` tables | Use `page.extract_table({"vertical_strategy": "lines", "horizontal_strategy": "lines"})`, or draw table grid lines in the generator (reportlab `TableStyle` GRID) |
| Narration split across 2 rows | Shorter narrations or smaller font in the generator; in the parser, append rows with no date to the previous row's narration |
| pikepdf `PasswordError` for the correct password | Use the same password as both user and owner password when generating; pass `password=` exactly |
| Golden vector off by ~0.01 | Check numpy.percentile default (linear) and that you compare unrounded FTS |
| Persona out of range | Change `data/personas.py` parameters, never the engine weights |
