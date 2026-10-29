# SahayakFin contracts (source of truth)

**Who changes this file:**
- Data, scoring and finance sections (§2–§4, §7): **Rajat**.
- API and DB sections (§5–§6): **Sanskar**.
- i18n and UI conventions (§8): **Mihir**.

Any change is announced in the team chat first, pushed in its own commit (`contracts: ...`), and everyone pulls.

## 0. Ownership map (who may edit what)

| Path | Owner |
| --- | --- |
| `frontend/**` (including `package.json`, lockfile, `src/locales/*`, `src/mocks/*`) | Mihir |
| `backend/app/ingest/**`, `backend/app/scoring/**`, `backend/app/finance/**`, `backend/tests/test_ingest*.py`, `backend/tests/test_scoring*.py`, `backend/tests/test_finance*.py`, `data/**`, `docs/ALGORITHM.md` | Rajat |
| `backend/app/*.py` (main, config, db, models, schemas, deps), `backend/app/api/**`, `backend/app/security/**`, `backend/app/services/**`, `backend/app/seed.py`, `backend/tests/test_api*.py`, `backend/tests/conftest.py`, `backend/requirements.txt`, `docker-compose.yml`, `.env.example`, `README.md`, `docs/ARCHITECTURE.md` | Sanskar |
| `CLAUDE.md`, `docs/CONTRACTS.md`, `docs/PRODUCT.md`, `docs/TEAM_PLAN.md`, `.claude/**`, `.githooks/**`, `scripts/**` | Shared (announce first) |
| `tasks/01_MIHIR_FRONTEND.md`, `tasks/02_RAJAT_SCORING.md`, `tasks/03_SANSKAR_BACKEND.md` | Each person owns their own file (tick boxes as you go) |
| `docs/PITCH.md` | Sanskar (drafted overnight) |
| `HANDOFF.md` | Everyone, but only append under your own or the target owner's heading |
| `REVIEW_1.md` | Everyone appends rows during Review 1 (00:30–00:50); after that, each owner only ticks their own rows |
| `NIGHT_LOG_<NAME>.md` | Each person, their own file |

Python packages that Rajat's code needs are already in `backend/requirements.txt`. If more are needed, ask Sanskar to add one line.

## 1. Global conventions

- **Money:** integer **paise** everywhere in the API and DB, in fields ending `_paise`. Internal maths may use float rupees. Rounding: `round()` to the nearest paisa at the boundary.
- **Dates:** ISO `YYYY-MM-DD`. Timestamps are ISO 8601 with offset. The timezone is Asia/Kolkata.
- **Weeks:** Monday to Sunday. `week_start` is the Monday. Only *complete* weeks are scored. The window is the **last 12 complete weeks ending on or before `as_of`**, where `as_of` is the last transaction date in the statement. If fewer than 12 complete weeks exist, use all of them.
- **Percentiles:** `numpy.percentile(x, q)` with default linear interpolation. Median = `numpy.median`.
- **Enums** are UPPER_SNAKE strings.
- **API base:** `/api/v1`.
  - Auth header: `Authorization: Bearer <jwt>`.
  - Errors: HTTP 4xx with `{"error": {"code": "UPPER_SNAKE", "message": "plain English"}}`. The frontend maps `code` to a translated message.
- **Demo identities:** OTP is always `123456` (also returned as `demo_otp`).

| Phone | Persona (display_name, used as `owner_name` and in self-transfer narrations) | Role |
| --- | --- | --- |
| 9000000001 | Ravi Shinde (`ravi`) | USER |
| 9000000002 | Sunita Jadhav (`sunita`) | USER |
| 9000000003 | Arjun Mehta (`arjun`) | USER |
| 9000000004 | Meena Pawar (`meena`) | USER |
| 9999999991 | MFI Alpha | LENDER |
| 9999999992 | MFI Beta | LENDER |
| 9999999993 | MFI Gamma | LENDER |

## 2. Transaction data

### 2.1 Python types (`backend/app/scoring/types.py`, owner Rajat; first commit within 20 min as stubs)

```python
from dataclasses import dataclass, field
from datetime import date
from typing import Optional, Literal

Direction = Literal["CR", "DR"]

@dataclass
class RawTxn:                     # straight out of the parser, unmasked, lives in memory only
    date: date
    narration: str
    amount: float                 # rupees, always positive
    direction: Direction
    balance: Optional[float] = None
    ref: Optional[str] = None

@dataclass
class Txn:                        # normalised, masked; this is what gets stored and scored
    id: str                       # uuid4 hex
    date: date
    amount_paise: int             # positive
    direction: Direction
    narration_masked: str
    payee_token: Optional[str]    # HMAC token, e.g. "P-3F2A9C1E"; None when there is no payee
    channel: str                  # UPI | NEFT | IMPS | ATM | NACH | CASH | CARD | OTHER
    category: str                 # see 2.2
    kind: str                     # see 2.3
    balance_paise: Optional[int] = None
    flags: list[str] = field(default_factory=list)   # e.g. ["ROUND_TRIP"], ["BOUNCE"], ["CASH_INCOME"]
    user_corrected: bool = False
```

### 2.2 Categories

These are the only allowed values. Each has an icon and an i18n key `category.<CODE>`.

| Code | Meaning | Example narration keywords (case-insensitive) |
| --- | --- | --- |
| PLATFORM_PAYOUT | Gig platform payout (income) | `PAYOUT`, `QUICKBITE`, `ZIPRIDE`, `SWIFTDROP` |
| CUSTOMER_RECEIPT | UPI received from customers (income) | `UPI/CR` from a person or shop |
| CASH_DEPOSIT | Cash deposited (income, flagged CASH_INCOME) | `CASH DEP`, `BY CASH` |
| OTHER_INCOME | Other credits | |
| FUEL | Fuel | `PETROL`, `HPCL`, `IOCL`, `BPCL`, `FUEL`, `CNG` |
| FOOD | Food and groceries | `KIRANA`, `GROCERY`, `HOTEL`, `MESS`, `DHABA`, `VEG`, `MILK` |
| RENT | Rent | `RENT`, landlord payee repeating monthly |
| BILLS | Electricity, gas, water | `POWER`, `ELECTRICITY`, `GAS`, `WATER`, `BILL` |
| PHONE | Mobile recharge / data | `RECHARGE`, `PREPAID`, `MOBILE` |
| TRANSPORT | Bus, train, auto, vehicle repair | `BUS`, `METRO`, `TRAIN`, `GARAGE`, `REPAIR`, `TYRE` |
| FAMILY | Money sent to family | `UPI/DR` to a person with `FAMILY`, `HOME`, or a repeating person payee |
| HEALTH | Medicine and clinic | `MEDICAL`, `PHARMA`, `CLINIC`, `HOSPITAL` |
| EDUCATION | School fees and books | `SCHOOL`, `FEES`, `TUITION` |
| SHOPPING | Other merchant spending | `UPI/DR` to merchants not matched above |
| CASH_WITHDRAWAL | ATM withdrawal | `ATM`, `CASH WDL` |
| EMI | Existing loan repayment | `EMI`, `ACH D-`, `NACH DR`, `LOAN` |
| SAVINGS | Transfer into a savings product | `RD`, `FD`, `SIP`, `GOLD`, `POST OFFICE`, `SAVINGS GOAL` |
| FEES_CHARGES | Bank charges, including bounce charges | `CHG`, `CHARGES`, `RTN CHG` |
| SELF_TRANSFER | Between own accounts | `SELF`, the owner's own name, `OWN A/C` |
| OTHER | Unknown | |

### 2.3 Kinds (how a transaction counts in scoring)

| Kind | Counts as | Rule |
| --- | --- | --- |
| INCOME | Income `I_w` | CR with category PLATFORM_PAYOUT, CUSTOMER_RECEIPT, CASH_DEPOSIT or OTHER_INCOME |
| EXPENSE | Expense `E_w` | DR with any spending category, including CASH_WITHDRAWAL, FEES_CHARGES and OTHER |
| SAVINGS | Savings action (not expense) | DR with category SAVINGS |
| DEBT | Existing debt `D_w` (not in `E_w`) and also a bill for discipline | DR with category EMI |
| IGNORED | Nothing | SELF_TRANSFER, refunds/reversals (`REV`, `REFUND`), loan disbursals (`LOAN DISB`), and both legs of a round trip |

**Round trip:** a DR to payee X and a CR from the same payee X within 7 days, where the amounts differ by no more than 10%. Both legs become IGNORED with flag `ROUND_TRIP`.

**Bounce:** narration matches `(?i)(NACH|ECS|ACH).*(RTN|RETURN|BOUNCE)|RETURN CHG|BOUNCE CHG`. Flag it `BOUNCE`. The charge itself is an EXPENSE in FEES_CHARGES.

### 2.4 Masking (applied in `normalize`, before anything is stored)

- Digit runs of 9–18 → `XXXX` + last 4.
- 10-digit phone numbers → `XXXXXX` + last 4.
- UPI handles `abc.def@bank` → first 2 chars + `****@bank`.
- Person or merchant names inside UPI/NEFT narrations → replaced by `payee_token`, where `payee_token = "P-" + HMAC_SHA256(PAYEE_HMAC_KEY, normalised_name).hexdigest()[:8].upper()`. The category keyword survives because categorisation runs **before** masking.
- `narration_masked` never contains a full account number, phone, UPI handle or person name.

### 2.5 Statement files

- **PDF layout "DEMO BANK"** (our generator): columns `Date | Narration | Ref No | Debit | Credit | Balance`, date format `DD-MM-YYYY`, one table per page. pdfplumber table extraction must work.
- **Locked PDFs:** the password is the first 4 letters of the persona name in uppercase plus `0101`, e.g. `RAVI0101`.
- **Second supported layout "ALT BANK"** (P1): `Txn Date | Value Date | Description | Withdrawal | Deposit | Balance`, date `DD/MM/YY`.
- **CSV:** header `date,narration,debit,credit,balance`, date `YYYY-MM-DD`, empty cell = 0.
- **AA JSON** (mock FIP response): `{"account": {"masked": "XXXX4521", "type": "SAVINGS"}, "transactions": [{"txnId": "...", "valueDate": "YYYY-MM-DD", "narration": "...", "amount": 123.45, "type": "DEBIT"|"CREDIT", "currentBalance": 456.78}]}`

## 3. Scoring engine (owner Rajat): exact rules

Weekly aggregates over the window (`W_obs` = number of complete weeks in the window):

- `I_w` = sum of INCOME in week w.
- `E_w` = sum of EXPENSE.
- `D_w` = sum of DEBT.
- `saved_w` = True if there is any SAVINGS transaction in week w, **or** the week's closing balance minus the previous week's closing balance ≥ `max(₹20, 0.02 × median(I_w))`. Closing balance = the last `balance_paise` in the week. Skip the balance rule if balances are missing.

**Smoothing monthly bills.**
- Rent, bills, phone recharges and EMIs to a *recurring bill payee* (the bill rules below) are paid once a month. Charging them in the week they happen would make every rent week look like a "bad week".
- So for `E_w` and `D_w` in **expense_health's W_surplus and in affordability/stress only**, replace each recurring payee's actual weekly payments with its window total ÷ W_obs, spread evenly over every week. `R` (total expense ÷ total income) is unaffected.
- Plain-language line for the UI and the pitch: "Rent is paid monthly, so we spread it across the weeks."
- The golden vectors in §7 pass E and D already per week, so smoothing doesn't apply to them.

**Components (0–100):**

1. `income_stability = 100 × min(P25(I_w) / P50(I_w), 1)`. If `P50(I_w) <= 0`, the score is unavailable and confidence is NONE.
2. `savings_habit = 100 × count(saved_w) / W_obs`. Zero savings over the observed window = 0. Never "unavailable".
3. `bill_discipline = max(0, 100 × B_ontime / B_total − 25 × N_bounce)`.
   - A recurring bill payee is any payee_token, or category key if there is no token, with ≥2 DR in the window in categories BILLS, PHONE, RENT or EMI.
   - `usual_day` = median day-of-month of its payments.
   - A payment is on time if the circular day difference from `usual_day` is ≤ 5.
   - `B_total` = number of payments to recurring bill payees. `N_bounce` = number of BOUNCE flags.
   - If `B_total == 0`, the component is **unavailable**: weight is re-spread (`available: false`).
4. `expense_health = 0.5 × band(R) + 0.5 × 100 × W_surplus / W_obs`
   - `R = ΣE_w / ΣI_w`.
   - `W_surplus` = weeks with `E_w ≤ I_w`.
   - `band(R)` = 100 if R ≤ 0.90; `100 − (R − 0.90)/0.30 × 100` if 0.90 < R ≤ 1.20; 0 if R > 1.20.

**Weights:** stability 0.30, savings 0.25, bills 0.25, expense 0.20.

`FTS = Σ(w_k × S_k over available) / Σ(w_k over available)`. Report `score = floor(FTS + 0.5)` (round-half-up; do not use Python `round`, which rounds 0.5 to even). The band uses the rounded score.

**Bands:** STRONG ≥ 80 · GOOD 60–79 · FAIR 40–59 · BUILDING < 40.

**Confidence** (shown separately; it never changes the score):

- HIGH: `W_obs ≥ 12` and the categorised share ≥ 80% (by value of DR+CR, excluding IGNORED; OTHER counts as uncategorised).
- MEDIUM: `W_obs` 8–11, or HIGH conditions with categorised share < 80%.
- LOW: `W_obs` 4–7. The score is "provisional".
- NONE: `W_obs < 4`. `score` is `null` and the user gets the "Build your profile" path.
- **Downgrade one level** if CASH_DEPOSIT is > 50% of total income.

**Reasons:** sort available components by `w × (100 − S)`, descending, and take the top 2 with shortfall > 0. Map each to a code:

| Component | Code |
| --- | --- |
| income_stability | `INCOME_UNEVEN` |
| savings_habit | `NO_SAVINGS_SEEN` if S == 0, else `FEW_SAVINGS_WEEKS` |
| bill_discipline | `BILL_BOUNCE` if N_bounce > 0, else `BILLS_LATE` |
| expense_health | `SPENDING_ABOVE_INCOME` if R > 0.90, else `FEW_SURPLUS_WEEKS` |

Add `THIN_FILE` as an extra reason when confidence is LOW.

**Tips:** for each reason, re-run the engine on modified weekly features and report `points = floor((new_FTS − old_FTS) + 0.5)` (round-half-up on unrounded FTS).

| Tip | Change simulated |
| --- | --- |
| `SAVE_EVERY_WEEK` | saved_w True for every week (message: "save ₹20 or more every week") |
| `PAY_BILLS_ON_TIME` | all bills on time, 0 bounces |
| `KEEP_SURPLUS_WEEKS` | every deficit week set to E_w = I_w |
| `STEADY_INCOME` | lowest weeks raised to the median, only up to P25 → P50 |
| `ADD_MORE_HISTORY` | for THIN_FILE, no points; `params: {"weeks_needed": 12 - W_obs}` |

### 3.1 ScoreResult (Python dict = API JSON)

```json
{
  "score": 81, "band": "STRONG", "confidence": "HIGH", "provisional": false,
  "weeks_observed": 12, "as_of": "2026-10-25",
  "components": {
    "income_stability": {"value": 97.5, "weight": 0.30, "available": true},
    "savings_habit":    {"value": 50.0, "weight": 0.25, "available": true},
    "bill_discipline":  {"value": 83.33, "weight": 0.25, "available": true},
    "expense_health":   {"value": 91.67, "weight": 0.20, "available": true}
  },
  "metrics": {"median_weekly_income_paise": 500000, "p25_weekly_income_paise": 487500,
              "expense_ratio": 0.8414, "weeks_in_surplus": 10, "bills_on_time": 5,
              "bills_total": 6, "bounces": 0, "savings_weeks": 6, "categorised_share": 0.93},
  "reasons": [{"code": "FEW_SAVINGS_WEEKS", "component": "savings_habit", "params": {"weeks": 6, "of": 12}},
              {"code": "BILLS_LATE", "component": "bill_discipline", "params": {"late": 1, "of": 6}}],
  "tips": [{"code": "SAVE_EVERY_WEEK", "points": 13, "params": {"min_amount_paise": 2000}},
           {"code": "PAY_BILLS_ON_TIME", "points": 4, "params": {}}],
  "engine_version": "fts-2.0"
}
```

(Component values, reasons and tip points shown are golden vector A in §7. `metrics.categorised_share` is illustrative.)

## 4. Affordability and finance (owner Rajat)

- `F_w = I_w − E_w − D_w` (savings transfers are not subtracted).
- `safe_weekly = max(0, min(0.5 × P25(F_w), 0.5 × P50(I_w) − mean(D_w)))`. If `P25(F_w) ≤ 0`, safe_weekly = 0 and there are no loans.
- `rbi_cap_weekly = 0.5 × P50(I_w) − mean(D_w)`. This is RBI's microfinance cap (all repayments ≤ 50% of income); ours is stricter.
- `payout_weekday`: the most common weekday of PLATFORM_PAYOUT credits, else of all INCOME. Instalments fall on this weekday.
- `loan_max(safe_weekly, rate_pct, weeks) = safe_weekly × (1 − (1+r)^−n) / r`, with `r = rate_pct/100/52` and `n = weeks`. Floor to the nearest ₹100.

**KFS:** `kfs(principal_paise, rate_pct, fee_pct, weeks, late_fee_paise=5000)` returns:

| Field | Value |
| --- | --- |
| `instalment_paise` | standard reducing-balance weekly EMI on the principal |
| `fee_paise` | `principal × fee_pct / 100` |
| `net_disbursed_paise` | `principal − fee` |
| `total_repayable_paise` | `instalment × n` |
| `total_cost_paise` | `total_repayable − net_disbursed` |
| `apr_pct` | `52 × weekly IRR` that equates `net_disbursed` to n instalments (bisection), rounded to 0.1 |

It also returns `advertised_rate_pct`, `n_instalments`, `late_fee_paise` and `cooling_off_days` (3).

**Stress test:** `stress_test(txns, shock, weekly_instalment_paise)`.

- Flexible categories (FUEL, FOOD, SHOPPING, TRANSPORT, OTHER, CASH_WITHDRAWAL) scale by `(1 − shock)`. Fixed ones (RENT, BILLS, PHONE, FAMILY, HEALTH, EDUCATION, FEES_CHARGES) do not.
- `stressed_F_w = (1−shock) I_w − E_fixed_w − (1−shock) E_flex_w − D_w`.
- `weeks_covered` = count of `stressed_F_w ≥ instalment`.
- `shortfall` = Σ max(0, instalment − stressed_F_w).
- `buffer_covers` = current balance (last balance) ≥ shortfall, or false if unknown.
- `light`:
  - GREEN if weeks_covered ≥ 10/12 of W_obs, or buffer_covers.
  - AMBER if ≥ 7/12.
  - RED otherwise.
- `advice`:
  - GREEN → `OK`.
  - AMBER → `CONSIDER_LONGER_TENURE`.
  - RED → `BUILD_BUFFER_FIRST` if safe_weekly is small, else `TAKE_SMALLER_AMOUNT`.

**Offer matching:** `match_offers(score_result, afford, lenders, products, requested_paise)`. For each loan product of each lender, in this order:

1. If `confidence == NONE` or band BUILDING → no loans.
2. `eligible = OUTSIDE` if the band is below `lender.min_band`, or `weeks_observed < lender.min_weeks`.
3. `amount = min(requested, product.max, loan_max(safe_weekly, rate, weeks))`, where weeks = the product's default tenure (26, or the closest allowed).
4. Caps:
   - Band FAIR: amount ≤ ₹5,000.
   - Confidence MEDIUM: amount ≤ 50% of loan_max.
   - Confidence LOW: amount ≤ ₹3,000.
5. If `amount < product.min` → OUTSIDE with `reason: BELOW_MIN_AMOUNT`.
6. If the score is within 5 points of the lender's band threshold, or confidence is MEDIUM → `NEEDS_REVIEW`. Else `ELIGIBLE`.
7. Attach `kfs(...)` and `fits_safe_instalment = kfs.instalment ≤ safe_weekly`.

Sort ELIGIBLE first, then by `apr_pct`. Insurance products are returned to everyone.

### 4.1 Python functions Sanskar's API calls (Rajat implements; stubs first)

| Module | Function | Returns |
| --- | --- | --- |
| `app.ingest` | `parse_statement(data: bytes, filename: str, password: str \| None) -> ParseResult` | `ParseResult(raw: list[RawTxn], kind: "PDF"\|"CSV"\|"AA", layout: str, period_from: date, period_to: date, warnings: list[str])`; raises `IngestError(code)` with the §5 upload codes |
| `app.ingest` | `normalize(raw: list[RawTxn], owner_name: str \| None, hmac_key: bytes) -> list[Txn]` | masked, categorised, kinds and flags set |
| `app.ingest` | `recategorize(txn: Txn, category: str) -> Txn` | kind recomputed, `user_corrected=True` |
| `app.scoring` | `compute_score(txns: list[Txn], as_of: date \| None = None) -> dict` | ScoreResult (§3.1) |
| `app.scoring` | `score_from_weekly(...)` | ScoreResult-like dict (for tests) |
| `app.scoring` | `what_if(txns, tip_code) -> dict` | `{"score_before","score_after","points"}` |
| `app.scoring` | `affordability(txns, existing_weekly_debt_paise: int \| None = None) -> dict` | the `/affordability` JSON (debt defaults to the measured mean D_w) |
| `app.scoring` | `stress_test(txns, shock: float, weekly_instalment_paise: int) -> dict` | the `/affordability/stress` JSON |
| `app.scoring` | `weekly_breakdown(txns, weeks: int = 4) -> dict` | the `/wellness/weekly` JSON without nudges |
| `app.scoring` | `nudges(txns, today: date, goal: dict \| None) -> list[dict]` | `[{"code","params"}]` |
| `app.scoring` | `fairness_report(personas: dict[str, dict], hmac_key: bytes) -> dict` where each value is `{"raw": list[RawTxn], "owner_name": str}` (raw so the name-swap test can re-normalise) | the `/fairness/report` JSON |
| `app.finance` | `kfs(principal_paise, rate_pct, fee_pct, weeks, late_fee_paise=5000) -> dict` | KFS |
| `app.finance` | `loan_max(safe_weekly_paise, rate_pct, weeks) -> int` | paise, floored to ₹100 |
| `app.finance` | `match_offers(score_result, afford, lenders: list[dict], products: list[dict], requested_paise) -> list[dict]` | Offer dicts without `id` (Sanskar adds the id and persists) |
| `app.finance` | `schedule(principal_paise, rate_pct, weeks, start: date, payout_weekday: str) -> list[dict]` | `[{"seq","due_date","amount_paise"}]`; first due date = first payout weekday ≥ start + 7 days |

**Offer dict:** `{"lender": {"id","name"}, "product_id", "amount_paise", "weeks", "frequency": "WEEKLY", "rate_pct", "fee_pct", "kfs": KFS, "fits_safe_instalment", "eligible": "ELIGIBLE"|"NEEDS_REVIEW"|"OUTSIDE", "reason": code|null}`

**Insurance (API):** `{"id","name","provider","premium_paise","premium_period":"YEAR"|"WEEK","cover_paise","is_govt_scheme","demo": true}`

### 4.2 Seed lenders and products (seeded by Sanskar's `seed.py`, values fixed here)

| Lender | min_band | min_weeks | Product | Amount (₹) | rate_pct | fee_pct | Tenures (weeks) | Frequency |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MFI Alpha | FAIR | 8 | Alpha Weekly | 2,000–10,000 | 24 | 2.0 | 13, 26, 52 | WEEKLY |
| MFI Beta | GOOD | 10 | Beta Flexi | 5,000–25,000 | 21 | 1.0 | 26, 52 | WEEKLY |
| MFI Gamma | STRONG | 12 | Gamma Growth | 10,000–50,000 | 18 | 1.5 | 26, 52 | WEEKLY |

| Insurance (all marked demo except PMSBY info card) | Premium | Cover |
| --- | --- | --- |
| Accident cover (modelled on govt PMSBY scheme, ages 18–70) | ₹20 / year | ₹2,00,000 accident death/disability |
| Hospital cash (fictional "Suraksha Mini") | ₹10 / week | ₹500 per hospital day, up to 10 days |
| Bike breakdown income cover (fictional "Pahiya Protect") | ₹15 / week | ₹300 per day off the road, up to 5 days |

## 5. REST API (owner Sanskar), base `/api/v1`

All routes need a JWT except `/auth/*`, `/health` and `/demo/samples/*`. Roles are USER and LENDER. A USER only ever sees their own data.

| Method & path | Request | Response |
| --- | --- | --- |
| GET `/health` | | `{"ok": true}` |
| POST `/auth/otp/request` | `{"phone"}` | `{"request_id", "demo_otp": "123456"}` |
| POST `/auth/otp/verify` | `{"phone","otp"}` | `{"access_token", "user": {"id","display_name","phone_masked","language","role"}}` |
| GET `/me` | | `{"user", "has_active_consent", "has_score", "has_loan"}` (the frontend uses this to decide which screen to open) |
| PATCH `/me` | `{"language": "en"\|"hi"\|"mr"}` | user |
| POST `/demo/reset` | | DEMO_MODE only: deletes the caller's consents, data, scores, offers and loans, and resets the clock → `{"ok": true}` |
| POST `/consents` | `{"purpose":"LOAN_ASSESSMENT","fi_types":["DEPOSIT"],"range_days":90,"data_life_days":30,"fetch_type":"ONETIME"}` | Consent |
| GET `/consents` | | `[Consent]` |
| POST `/consents/{id}/revoke` | | `{"consent": Consent, "deleted": {"transactions": n, "sources": m}}` |
| POST `/aa/fetch` | `{"consent_id","persona"}` | StatementResult (data comes from `data/samples/<persona>.aa.json`) |
| POST `/statements` | multipart `file`, `consent_id`, optional `password` | StatementResult |
| GET `/transactions` | `?weeks=12` | `{"weeks":[{"week_start","income_paise","expense_paise","txns":[TxnOut]}]}` |
| PATCH `/transactions/{id}` | `{"category"}` | `{"txn": TxnOut, "score": ScoreResult}` |
| POST `/scores` | | ScoreResult (recompute and store) |
| GET `/scores/latest` | | ScoreResult + `{"id","created_at"}` |
| POST `/scores/what-if` | `{"tip_code"}` | `{"score_before","score_after","points"}` |
| GET `/affordability` | | `{"safe_weekly_paise","p25_weekly_surplus_paise","median_weekly_surplus_paise","median_weekly_income_paise","existing_weekly_debt_paise","rbi_cap_weekly_paise","payout_weekday","loan_max_paise":{"13":..,"26":..,"52":..}}` (at 24%) |
| POST `/affordability/stress` | `{"shock":0\|0.1\|0.2\|0.3,"weekly_instalment_paise"}` | `{"weeks_covered","weeks_total","light","buffer_covers","shortfall_paise","advice"}` + any extra fields from `scoring.stress_test` (e.g. `series`) passed through |
| GET `/offers` | `?requested_paise=1000000` | `{"requested_paise","safe_amount_paise","rbi_cap_amount_paise","loans":[Offer],"insurance":[Insurance]}` (`rbi_cap_amount_paise` = `finance.loan_max(rbi_cap_weekly_paise, 24, 26)`, for the safe-zone meter) |
| POST `/offers/{id}/accept` | `{"amount_paise","weeks"}` | Loan with `schedule` |
| GET `/loans` | | `[Loan]` |
| POST `/repayments/{id}/pay` | | Repayment |
| GET `/reminders` | | `[{"id","repayment_id","send_at","code","params","sent"}]` |
| POST `/demo/advance-clock` | `{"days": 1..30}` | `{"now"}` (moves the simulated clock; reminders and statuses follow) |
| GET `/demo/samples/{persona}.{pdf\|csv}` | | the sample file (for "try a demo profile") |
| GET `/wellness/weekly` | `?weeks=4` | `{"weeks":[{"week_start","income_paise","expense_paise","by_category":{"FUEL":paise,..}}],"avg4_by_category":{..},"nudges":[{"code","params"}]}` |
| POST `/goals` / GET `/goals` | `{"name","target_paise"}` | Goal `{"id","name","target_paise","weekly_target_paise","saved_paise","weeks_left"}` |
| GET `/audit` | | `[{"ts","actor_role","actor_name","action","purpose"}]` |
| POST `/shares` / DELETE `/shares/{id}` | `{"lender_id"}` | `{"id","lender_id","created_at"}` |
| GET `/lenders` | | `[{"id","name","min_band"}]` |
| GET `/lender/applicants` (LENDER) | | `[{"applicant_ref":"APP-7F3A","score","band","confidence","reasons":[code],"safe_weekly_paise","requested_paise","eligible"}]` |
| PUT `/lender/rules` (LENDER) | `{"min_band","max_amount_paise","min_weeks"}` | `{"rules","eligible_before","eligible_after"}` |
| GET `/fairness/report` | | `{"tests":[{"code","passed","detail"}],"personas":[{"name","monthly_income_paise","score","band","confidence"}]}` |

**StatementResult:**

```json
{"source_id": "…", "kind": "PDF"|"CSV"|"AA", "period": {"from": "2026-07-28", "to": "2026-10-25"},
 "weeks_covered": 12, "txn_count": 214, "warnings": [],
 "stages": [{"code":"READ","ms":180},{"code":"MASK","ms":40},{"code":"CATEGORISE","ms":35},{"code":"SCORE","ms":12}],
 "score": ScoreResult}
```

**TxnOut:** `{"id","date","amount_paise","direction","narration_masked","category","kind","flags","user_corrected"}`. Never includes `payee_token` or the balance.

**Upload error codes:** `UNSUPPORTED_FILE`, `FILE_TOO_LARGE` (> 5 MB), `TOO_MANY_PAGES` (> 20), `PDF_PASSWORD_REQUIRED`, `PDF_PASSWORD_WRONG`, `PDF_HAS_SCRIPT`, `NO_TRANSACTIONS`, `CONSENT_REQUIRED`, `CONSENT_REVOKED`.

**All other error codes** (the frontend needs an `error.<CODE>` text for each):

| Area | Codes |
| --- | --- |
| Auth | `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `OTP_INVALID` (401), `TOO_MANY_REQUESTS` (429) |
| Validation | `VALIDATION_ERROR` (422), `NOT_FOUND` (404), `INTERNAL_ERROR` (500) |
| Scores and offers | `NO_SCORE`, `OFFER_NOT_ACCEPTABLE`, `EXCEEDS_SAFE_INSTALMENT` |
| Ingest and demo | `UNKNOWN_PERSONA`, `BAD_CATEGORY`, `BAD_TIP` |

**Audit:** every read of a user's data by a LENDER, every consent create/revoke, every upload and every share writes an `audit_log` row.

**Audit action codes:** `CONSENT_CREATED`, `CONSENT_REVOKED`, `CONSENT_EXPIRED`, `STATEMENT_UPLOADED`, `TXN_RECATEGORISED`, `LOAN_ACCEPTED`, `REPAYMENT_PAID`, `SHARED_WITH_LENDER`, `SHARE_REVOKED`, `VIEW_SCORE_SUMMARY`.

**Reminder codes:** `REMINDER_T_MINUS_2`, `REMINDER_DUE_TODAY`, `REMINDER_OVERDUE_1`, `REMINDER_OVERDUE_7`. Params: `{"amount_paise","due_date","lender"}`. Send only between 09:00 and 18:00 simulated time.

**Nudge codes:** `PAYDAY_SAVE` `{amount_paise, suggest_paise}`, `CATEGORY_SPIKE` `{category, pct}`, `BILL_SOON` `{category, day}`, `GOAL_PROGRESS` `{done_weeks, total_weeks}`.

## 6. Database (owner Sanskar)

Use SQLAlchemy 2.0 with generic types. Primary keys are string uuid4 hex. Money columns are `BigInteger` in paise. Create tables with `Base.metadata.create_all()` at startup; there are no migrations.

| Table | Columns |
| --- | --- |
| users | id, phone_hash, phone_last4, display_name, role (USER/LENDER), lender_id (nullable), language, persona_slug, created_at |
| consents | id, user_id, purpose, fi_types (JSON), range_from, range_to, data_life_days, fetch_type, status (ACTIVE/REVOKED/EXPIRED), created_at, expires_at, revoked_at |
| data_sources | id, user_id, consent_id (FK **ON DELETE CASCADE**), kind, file_sha256, period_from, period_to, weeks_covered, created_at |
| transactions | id, source_id (FK CASCADE), user_id, txn_date, amount_paise, direction, narration_enc (AES-GCM, base64), payee_token, channel, category, kind, balance_paise, flags (JSON), user_corrected |
| score_runs | id, user_id, score, band, confidence, result (JSON = ScoreResult), engine_version, created_at |
| lenders | id, name, min_band, min_weeks, max_amount_paise |
| products | id, lender_id, kind (LOAN/INSURANCE), name, min_paise, max_paise, rate_pct, fee_pct, tenures (JSON), premium_paise, premium_period, cover_paise, is_govt_scheme |
| offers | id, user_id, product_id, score_run_id, amount_paise, weeks, kfs (JSON), eligible, status |
| loans | id, user_id, offer_id, principal_paise, instalment_paise, weeks, start_date, payout_weekday |
| repayments | id, loan_id, seq, due_date, amount_paise, status (UPCOMING/DUE/PAID/OVERDUE), paid_at |
| reminders | id, repayment_id, code, params (JSON), send_at, sent |
| goals | id, user_id, name, target_paise, weekly_target_paise, saved_paise, created_at |
| lender_shares | id, user_id, lender_id, consent_id, created_at, revoked_at |
| audit_log | id, ts, actor_role, actor_id, actor_name, subject_user_id, action, purpose (insert only) |

- **Revoke** sets the consent to REVOKED and deletes its data_sources, which cascades to transactions. `score_runs` stay as lending records, marked "consent revoked" in the UI.
- **Data life:** on each request, consents past `expires_at` become EXPIRED and their data is deleted the same way.
- **On SQLite**, enable foreign keys with `PRAGMA foreign_keys=ON` on connect, or cascades won't fire.

## 7. Golden test vectors (must pass)

Weekly-level vectors, in rupees. Expose a pure function `score_from_weekly(I, E, saved, bills_on_time, bills_total, bounces, D=None)` in `backend/app/scoring/engine.py` so these can be tested directly.

| Vector | Input | Expected |
| --- | --- | --- |
| A (steady) | I = [5000,5200,4800,5100,3000,5000,5300,4900,5100,2500,5000,5200]; E = [4000,4100,3900,4200,3500,4000,4300,3800,4100,3200,4000,4100]; saved = [1,0,1,0,0,1,1,0,1,0,1,0]; bills 5/6, 0 bounces | stability 97.5; savings 50.0; bills 83.33; R 0.8414; W_surplus 10; expense 91.67; **FTS 80.92 → 81 STRONG**; P25(F) 900; **safe_weekly 450.0** |
| B (volatile, no savings, bounce) | I = [9000,3000,15000,6000,12000,4000,16000,8000,3500,11000,9500,7000]; E = [7000,6500,7500,6800,7200,6000,7800,6900,6200,7100,7000,6600]; saved = all 0; bills 3/6, 1 bounce | stability 64.71; savings 0; bills 25.0; R 0.7942; W_surplus 8; expense 83.33; **FTS 42.33 → 42 FAIR**; P25(F) −1100; **safe_weekly 0** |
| C | Vector A with no bills (B_total = 0) | bills unavailable; **FTS 80.11 → 80 STRONG** |
| D (thin) | I = [3500,3600,3400,3500,3550]; E = [2900,3000,2800,2950,2900]; saved = [1,0,1,0,1]; bills 2/2 | stability 100; savings 60; bills 100; expense 100; **FTS 90.0**; confidence LOW, provisional |
| Scale | Vector A with every amount × 2 | FTS 80.92 (unchanged) |
| Reasons A | Vector A | `FEW_SAVINGS_WEEKS`, `BILLS_LATE`; tips `SAVE_EVERY_WEEK` +13, `PAY_BILLS_ON_TIME` +4 |
| Reasons B | Vector B | `NO_SAVINGS_SEEN`, `BILL_BOUNCE`; tips `SAVE_EVERY_WEEK` +25, `PAY_BILLS_ON_TIME` +19 |

| band(R) input | 0.85 | 1.00 | 1.20 | 1.35 |
| --- | --- | --- | --- | --- |
| Output | 100 | 66.67 | 0 | 0 |

| Finance check | Expected |
| --- | --- |
| `loan_max(31100 paise, 24, 26)` | 760318 paise (₹7,603.18) → floored to ₹7,600 |
| `kfs(750000, 24, 2.0, 26)` | instalment 30678; fee 15000; net 735000; total 797627; cost 62627; **apr_pct 32.0** |

(±1 paisa tolerance on paise values; ±0.01 on components.)

**Persona acceptance ranges** (from generated transaction data; exact values may differ):

| Persona | Expected |
| --- | --- |
| Sunita | score ≥ 85, STRONG, HIGH |
| Ravi | 72–88, STRONG or GOOD, HIGH, safe_weekly ₹250–₹400 |
| Arjun | 35–55 FAIR, ≥ 1 bounce, savings 0 |
| Meena | LOW confidence, provisional, 5 complete weeks |
| All four | ranking Sunita > Ravi > Arjun on score |

## 8. Frontend conventions (owner Mihir)

- **Stack:** React + Vite + TypeScript + Tailwind + react-router + react-i18next + Recharts + lucide-react icons.
- **Types:** in `frontend/src/api/types.ts`, mirroring §3.1 and §5 exactly.
- **Data source:** `VITE_USE_MOCKS=true` serves responses from `frontend/src/mocks/*.json`, which use the JSON shapes above. The app must work fully on mocks before the API is ready, then flip the flag to false.
- **Money:** one helper `formatINR(paise)` using `Intl.NumberFormat('en-IN', {style:'currency', currency:'INR', maximumFractionDigits: 0})`.
- **i18n:**
  - Files are `src/locales/{en,hi,mr}.json`.
  - Key namespaces: `common.*`, `screen.<name>.*`, `band.*`, `confidence.*`, `component.*`, `reason.<CODE>`, `tip.<CODE>`, `category.<CODE>`, `nudge.<CODE>`, `reminder.<CODE>`, `error.<CODE>`, `light.*`, `advice.<CODE>`, `fairness.<CODE>`, `audit.<ACTION>`.
  - Params are interpolated, with money pre-formatted by `formatINR`.
- **Band colours (always paired with the word):** STRONG green `#1a7f37`, GOOD green `#2da44e`, FAIR amber `#bf8700`, BUILDING grey `#6e7781` (never red).
- **Fonts:** Noto Sans + Noto Sans Devanagari (Google Fonts) so Hindi and Marathi render well.
- **Layout:** the user app renders inside a centred 390×844 phone frame on desktop and full-screen on mobile. `/lender` and `/fairness` are desktop layouts.
