# Sanskar: Backend API, database, security and seed

## Your role in one paragraph

You build the server that everything runs through: login, consent, upload, storage, the API that the app and the lender dashboard call, and all the security. This carries **"Data Privacy & Security", 25%**, and most of **"System Architecture", 15%.** You call Rajat's pure functions (CONTRACTS §4.1). You never put scoring logic in the API. Mihir's frontend calls your endpoints exactly as in CONTRACTS §5.

**You own:**
- `backend/app/*.py` (main, config, db, models, schemas, seed)
- `backend/app/api/**`, `backend/app/security/**`, `backend/app/services/**`
- `backend/tests/test_api*.py`, `backend/tests/conftest.py`, `backend/requirements.txt`
- `docker-compose.yml`, `.env.example`, `README.md`, `docs/ARCHITECTURE.md`, `docs/PITCH.md`, this file

**Never edit:** `app/ingest`, `app/scoring`, `app/finance` (Rajat) or `frontend/**` (Mihir).

**Sync:** `bash scripts/sync.sh backend "api: <what>"`. It runs `python -m pytest -q` before pushing.

**Plain-language glossary:**
- **JWT:** a signed login ticket the app sends with every request.
- **Cascade delete:** deleting a parent row automatically deletes its child rows.
- **AES-GCM:** strong encryption; we encrypt statement text before saving it.
- **IDOR:** a bug where user A can read user B's data by changing an id. We test that this can't happen.
- **Audit log:** a diary of who looked at whose data.

## Your timeline

| Phase | Time | You deliver |
| --- | --- | --- |
| 0 | 22:50–23:05 | Repo exists and teammates are in (skip if done) |
| 1 | 23:05–00:30 | Skeleton → auth + seed → consent + upload + scores (API live 23:50) → offers + accept + loans (00:10) → flow test |
| Review 1 | 00:30–00:50 | Run the demo from your laptop (backend + frontend); note API issues |
| 2 | 00:50–02:15 | Security hardening, revoke/expiry/audit, AA fetch, recategorise, affordability/stress, reminders + clock, wellness/goals, shares, fairness, full flow test |
| 3 | 02:15–02:55 | Lender endpoints, Postgres run, seed reset, README; Demo 2 |
| 4 | 03:00–07:00 | Night shift (Claude alone) |
| 5 | 07:00–08:00 | Merge, demo DB reset, pitch numbers |

## Status (branch `sanskar/backend`)

- [x] Phase 1: 1.1 skeleton · 1.2 security + auth + seed · 1.3 consent + upload + scores · 1.4 offers/accept/loans · 1.5 flow test (CSV + locked PDF)
- [ ] 1.6 demo laptop (manual: run backend + frontend with `VITE_USE_MOCKS=false`)
- [x] Phase 2: 2.1 consent lifecycle + audit · 2.2 AA fetch + recategorise · 2.3 upload hardening + IDOR · 2.4 stress + offers polish · 2.5 clock/repayments/reminders · 2.6 wellness + goals · 2.7 shares + fairness + seed with data · 2.8 full flow test
- [x] Phase 3: 3.1–3.4 (3.5 Demo 2 is manual)
- [x] Phase 4: security suite, error-shape test, missing SAMPLES_DIR log, timing log, docs/ARCHITECTURE.md, docs/PITCH.md, NIGHT_LOG_SANSKAR.md

## Target folder layout (create exactly this)

```
backend/app/
  main.py          # FastAPI app, CORS, error handlers, include routers under /api/v1, startup: create_all + seed
  config.py        # Settings from env (python-dotenv): DATABASE_URL, JWT_SECRET, DATA_KEY, PAYEE_HMAC_KEY,
                   # DEMO_MODE, FRONTEND_ORIGIN, SAMPLES_DIR
  db.py            # engine, SessionLocal, Base, get_db(); SQLite: connect_args check_same_thread=False + PRAGMA foreign_keys=ON
  models.py        # all tables from CONTRACTS §6 (SQLAlchemy 2.0 typed mappings, generic JSON type)
  schemas.py       # pydantic request models (responses can be plain dicts matching CONTRACTS)
  errors.py        # class AppError(Exception): code, status, message  + handlers
  seed.py          # idempotent seed; `python -m app.seed --reset`
  security/
    jwt.py         # create_token(user) / decode_token
    crypto.py      # encrypt(text)->str, decrypt(str)->text  (AES-256-GCM, 12-byte nonce, base64(nonce+ct))
    hashing.py     # phone_hash(phone) = sha256(JWT_SECRET + phone)
    ratelimit.py   # in-memory sliding window: 5 OTP requests / 60 s / phone
    deps.py        # current_user (from Bearer), require_role("LENDER"), require_active_consent
    upload_guard.py# validate_upload(bytes, filename) -> kind ; raises AppError codes
  services/
    clock.py       # now() = real now + demo offset; advance(days); reset()
    audit.py       # audit(db, actor, action, purpose, subject_user_id)
    txn_store.py   # save_txns(db, source, txns) (encrypt narration) / load_txns(db, user_id) -> list[Txn]
    scoring_service.py # rescore(db, user) -> ScoreResult stored in score_runs
    reminders.py   # build reminders for a loan given clock.now()
  api/
    auth.py  me.py  consents.py  aa.py  statements.py  transactions.py  scores.py
    afford.py  offers.py  loans.py  wellness.py  goals.py  privacy.py  lender.py  fairness.py  demo.py
backend/tests/
  conftest.py (temp SQLite per test session, TestClient, login helper)
  test_api_auth.py  test_api_upload.py  test_api_offers.py  test_api_flow.py  test_api_security.py
```

---

## Phase 0: Setup (22:50 → 23:05). Skip whatever you already did.

- [x] The repo is on GitHub, private, with Mihir and Rajat as collaborators (see the older instructions: `git init -b main`, set identity, `bash scripts/setup-dev.sh`, first commit "chore: project kit", push).
- [x] Set up Python:
  ```bash
  cd backend && python -m venv .venv
  source .venv/bin/activate          # Windows: .venv\Scripts\activate
  pip install -r requirements.txt
  cp ../.env.example ../.env
  ```
  `config.py` loads `../.env` relative to `backend/`, or from the repo root; support both.
- [x] Start `claude` at the repo root.

---

## Phase 1: First Demo build (23:05 → 00:30)

**Paste this prompt:**

```
I am Sanskar. I own the FastAPI app, DB, security, seed and API tests of SahayakFin (docs/CONTRACTS.md §0).
Read CLAUDE.md, ALL of docs/CONTRACTS.md (source of truth: §1 conventions/demo identities, §4.1 functions I call, §4.2 seed data, §5 API, §6 DB), docs/PRODUCT.md §5 and tasks/03_SANSKAR_BACKEND.md (Phase 1 + target folder layout).
Do Phase 1 items 1.1 → 1.6 in order. Rajat's stubs for app.ingest/app.scoring/app.finance land on main ~23:20 — `git pull --rebase origin main` and import them; never edit those packages.
For each item: implement per spec, add the listed pytest tests (TestClient + temp SQLite), run `cd backend && python -m pytest -q`, tick the box in my task file, commit only my paths (no AI attribution, ever). Sync with `bash scripts/sync.sh backend "<msg>"` after 1.4 and 1.5.
Errors are always {"error":{"code","message"}}. Money in paise. Never write uploaded files to disk.
```

### 1.1 Skeleton (23:05 → 23:20)

- `config.py`: a `Settings` dataclass. `DATA_KEY` is base64 → 32 bytes; refuse to start if it's the wrong length.
- `db.py`, `models.py`: all 14 tables of CONTRACTS §6.
  - String uuid hex primary keys with `default=lambda: uuid4().hex`.
  - `BigInteger` for paise; `JSON` for json columns; `DateTime(timezone=True)`.
  - Foreign keys with `ondelete="CASCADE"` on data_sources.consent_id and transactions.source_id. Also cascade on the relationships (`cascade="all, delete-orphan"`, `passive_deletes=True`).
- `errors.py`:
  - `AppError` + handler → `{"error": {"code", "message"}}`.
  - Pydantic validation errors → 422 `{"error": {"code": "VALIDATION_ERROR", "message": ...}}`.
  - Unknown exceptions → 500 `INTERNAL_ERROR`, and log **without** request bodies.
- `main.py`: CORS for `FRONTEND_ORIGIN`; routers at `/api/v1`; startup runs `create_all` + `seed()`; `GET /api/v1/health`.
- **Acceptance:** `uvicorn app.main:app --reload --port 8000` → http://localhost:8000/docs loads; `/api/v1/health` → `{"ok": true}`.

### 1.2 Security core + auth + seed (23:20 → 23:40)

- `security/jwt.py`: HS256, claims `sub` (user id), `role`, `exp`. Expiry is 15 min, or 12 h when `DEMO_MODE=true`.
- `security/crypto.py`: AES-GCM via `cryptography.hazmat.primitives.ciphers.aead.AESGCM`.
- `security/deps.py`: `current_user` (401 `UNAUTHENTICATED`) and `require_role` (403 `FORBIDDEN`).
- `api/auth.py`:
  - `POST /auth/otp/request` (rate-limited; 429 `TOO_MANY_REQUESTS`).
  - `POST /auth/otp/verify`: OTP must be `123456`; 401 `OTP_INVALID`. Creates the user if the phone is unknown (role USER, display_name "Guest").
  - Returns `{access_token, user}`.
- `api/me.py`: `GET /me` (flags `has_active_consent`, `has_score`, `has_loan`) and `PATCH /me`.
- `seed.py` (idempotent, keyed on phone hash):
  - 4 persona users + 3 lender users (CONTRACTS §1).
  - 3 lenders + 3 loan products + 3 insurance products (§4.2).
  - Add a `max_amount_paise` column on lenders = the product max.
- Tests:
  - login OK; wrong OTP → 401;
  - 6th OTP request in a minute → 429;
  - a USER token on `/lender/applicants` → 403 (the stub route exists by Phase 3; for now test `require_role` directly);
  - seed run twice → no duplicates.

### 1.3 Consent + upload + scores (23:40 → 00:00): API live for Mihir at 23:50

- `api/consents.py`:
  - `POST /consents`: validate purpose `LOAN_ASSESSMENT`, `range_days` 30–365, `data_life_days` 1–90.
  - `range_from = today − range_days`; `expires_at = now + data_life_days`. Audit `CONSENT_CREATED`.
  - `GET /consents`: newest first.
  - `POST /consents/{id}/revoke`: in Phase 1 just set REVOKED and delete its sources (the cascade removes transactions). Return the counts. Audit `CONSENT_REVOKED`.
- `security/upload_guard.py` → `validate_upload(data, filename)`:
  - Size ≤ 5 MB, else `FILE_TOO_LARGE`.
  - Kind by signature: `%PDF-` → PDF; else try UTF-8 CSV; else `UNSUPPORTED_FILE`.
  - PDF: reject if the bytes contain `/JavaScript`, `/JS`, `/EmbeddedFile`, `/Launch` or `/OpenAction` with JS (`PDF_HAS_SCRIPT`). Page count via the `/Type /Page` count is approximate; Rajat's parser also checks. Over 20 pages → `TOO_MANY_PAGES`.
- `services/txn_store.py`:
  - `save_txns`: one `data_sources` row (kind, sha256, period, weeks), plus transactions with `narration_enc = encrypt(narration_masked)`.
  - `load_txns(user_id)` → `list[Txn]` from **ACTIVE** consents only, narration decrypted.
- `services/scoring_service.py`: `rescore(db, user)` → `compute_score(load_txns(...))` → insert a `score_runs` row → return the result + id + created_at.
- `api/statements.py` → `POST /statements` (multipart `file`, `consent_id`, optional `password`):
  1. Check the consent is ACTIVE and belongs to the user, else `CONSENT_REQUIRED` / `CONSENT_REVOKED`.
  2. Read the bytes into memory → `validate_upload`.
  3. Time each stage with `time.perf_counter()`: READ = `parse_statement`; MASK + CATEGORISE = `normalize` (report MASK as 40% of the normalize time and CATEGORISE as 60%, or call them separately if Rajat exposes them); SCORE = `rescore`.
  4. `IngestError` → 400 with its code.
  5. Return StatementResult. Audit `STATEMENT_UPLOADED`. **Never write the file to disk; drop the bytes after parsing.**
- `api/scores.py`:
  - `POST /scores`: rescore.
  - `GET /scores/latest`: 404 `NO_SCORE` if none.
  - `POST /scores/what-if` → `scoring.what_if`.
- `api/transactions.py` → `GET /transactions?weeks=12`: group by week_start (Monday), newest week first. TxnOut fields only.
- Tests: upload `data/samples/ravi.csv` (or a tiny inline CSV if the samples aren't on main yet) → 200 with a score; random bytes → `UNSUPPORTED_FILE`; a PDF containing `/JavaScript` → `PDF_HAS_SCRIPT`; no consent → `CONSENT_REQUIRED`.
- **Sync at 23:50.** Post: "API live: auth, consent, statements, scores, me".

### 1.4 Offers, accept, loans (00:00 → 00:15)

- `api/afford.py` → `GET /affordability` → `scoring.affordability(load_txns(user))`.
- `api/offers.py` → `GET /offers?requested_paise=`:
  1. Latest score, affordability.
  2. Lenders and products from the DB as dicts.
  3. `finance.match_offers(...)`.
  4. Persist each loan offer (status OFFERED) with an id.
  5. Return `{requested_paise, safe_amount_paise: loan_max_paise["26"], rbi_cap_amount_paise: finance.loan_max(rbi_cap_weekly_paise, 24, 26), loans, insurance}`. `rbi_cap_amount_paise` feeds the website's safe-zone meter.
  - `requested_paise` defaults to 1,000,000. Insurance products are returned to everyone with `demo: true` (PMSBY: `is_govt_scheme: true`).
- `POST /offers/{id}/accept` `{amount_paise, weeks}`:
  - The offer must be the user's, OFFERED, and ELIGIBLE or NEEDS_REVIEW; else 400 `OFFER_NOT_ACCEPTABLE`.
  - Recompute the KFS for the chosen amount and weeks via `finance.kfs`. The instalment must be ≤ safe weekly, else `EXCEEDS_SAFE_INSTALMENT`.
  - `finance.schedule(..., start=clock.today(), payout_weekday)` → loan + repayments. Offer status ACCEPTED. Audit `LOAN_ACCEPTED`.
  - Return the loan with its schedule.
- `api/loans.py` → `GET /loans`: loans with schedule. Statuses come from `clock.now()`: PAID if `paid_at`; DUE if due_date == today; OVERDUE if past; else UPCOMING.
- **Sync at 00:10.** Post: "offers/accept/loans live".

### 1.5 First flow test (00:15 → 00:25)

`tests/test_api_flow.py`: login Ravi → consent → upload `ravi.csv` → score present → offers (≥ 1 ELIGIBLE or NEEDS_REVIEW) → accept → schedule of n rows with the weekday equal to `payout_weekday`. Then the same with `ravi.locked.pdf` + password `RAVI0101` (skip if the PDF isn't on main yet).

**Sync.**

### 1.6 Demo laptop (00:25 → 00:30)

Pull everything; run the backend and Mihir's frontend on **your** laptop with `VITE_USE_MOCKS=false`, ready for the first demo.

**If you are behind at 00:10:** drop the PDF from 1.5 and keep the CSV path. Accept can skip the safe-instalment check in Phase 1.

---

## Review 1 (00:30 → 00:50)

Drive the demo. For your area, check:
- Any slow request (> 1 s)?
- Any 500 errors?
- Is the error text friendly?
- Does the TxnOut contain anything sensitive?

Write lines in `REVIEW_1.md`.

**Review 1 fixes for me (copy MUST/SHOULD lines here):**
- [ ] …

---

## Phase 2: Complete backend (00:50 → 02:15)

**Paste this prompt** (after `/clear`):

```
I am Sanskar. Phase 1 is on main. Re-read CLAUDE.md, docs/CONTRACTS.md §4.1, §5, §6 and Phase 2 of tasks/03_SANSKAR_BACKEND.md including my "Review 1 fixes".
Do the Review 1 fixes first, then 2.1 → 2.8 in order, with tests for each, ticking boxes and committing only my paths. Sync after 2.3, 2.6 and 2.8. Pull main before 2.4 and 2.7 because Rajat's Phase 2 functions land around 01:45.
```

### 2.1 Consent lifecycle + audit (privacy marks)

- **Expiry sweep:** a dependency that runs on every authenticated request. Consents past `expires_at` → EXPIRED, and their sources are deleted. Audit `CONSENT_EXPIRED` with actor SYSTEM.
- **Revoke:**
  - also revokes the user's `lender_shares` for that consent;
  - keeps `score_runs`, but every later `GET /scores/latest` adds `"consent_revoked": true` when no ACTIVE consent exists;
  - returns the deleted counts.
- `services/audit.py` is used everywhere listed in CONTRACTS §5 (Audit). `actor_name` is readable: "You", "MFI Alpha", "System".
- `GET /audit`: newest first, max 50.
- Tests:
  - revoke → `GET /transactions` returns 0 weeks;
  - expired consent (set `expires_at` in the past in the test) → data gone on the next request;
  - the audit list contains CONSENT_CREATED, STATEMENT_UPLOADED and CONSENT_REVOKED.

### 2.2 Simulated AA + recategorise

- `POST /aa/fetch` `{consent_id, persona}`:
  - persona ∈ the 4 slugs, else 400 `UNKNOWN_PERSONA`;
  - read `SAMPLES_DIR/<persona>.aa.json` → the same pipeline as `/statements`, kind "AA";
  - add a 600 ms fake "bank latency" in the READ stage when DEMO_MODE, so the stages are visible.
- `PATCH /transactions/{id}` `{category}`:
  - load the txn (must be the user's);
  - `ingest.recategorize` → save → `rescore`;
  - return `{txn, score}`. Audit `TXN_RECATEGORISED`.
- Tests: AA fetch for Ravi gives the same score as the CSV upload; recategorise changes `user_corrected`.

### 2.3 Upload hardening (security marks)

- Reject a content-type/extension mismatch (`.pdf` that isn't a PDF) with `UNSUPPORTED_FILE`.
- The PDF password is never logged. Add a test that captures logs during an upload and asserts the password string is absent.
- **IDOR tests:** user A can't GET or PATCH user B's transactions, offers, loans or consents (404, not 403, so ids aren't confirmed).
- **Lender response key check:** the lender JSON never contains `narration`, `phone`, `payee_token`, `balance` or `display_name` (assert recursively on keys). The stub route lands in Phase 3; write the test now with `xfail`.
- **Sync.**

### 2.4 Affordability stress + offers polish

- `POST /affordability/stress` → `scoring.stress_test`; `shock` ∈ {0, 0.1, 0.2, 0.3}, else `VALIDATION_ERROR`. Pass Rajat's `series` through untouched (the website risk graph needs it).
- `/offers`: include `fits_safe_instalment` and the `reason` from match_offers. Requested amount must be > 0 and ≤ ₹1,00,000.
- **Demo-proof:** if the user has no score yet, `/offers` → 400 `NO_SCORE`. The frontend shows "Upload a statement first".

### 2.5 Clock, repayments, reminders

- `services/clock.py`: the module offset, `now()`, `today()`, `advance(days)`, `reset()`.
- `POST /demo/advance-clock` `{days 1..30}` (DEMO_MODE only, else 404).
- `POST /repayments/{id}/pay`: the repayment must be the user's and not PAID → PAID with `paid_at = clock.now()`. Audit `REPAYMENT_PAID`.
- `services/reminders.py`: for each unpaid repayment, generate (idempotently) up to 4 reminders: T−2, due day, +1, +7. `send_at` is that date at 10:00 IST; `sent = send_at <= clock.now()`.
- `GET /reminders`: only `sent=true` ones, newest last (chat order), with `params {amount_paise, due_date, lender}`.
- `POST /demo/reset`: delete the caller's consents (cascade), score_runs, offers, loans and goals; reset the clock.
- `GET /demo/samples/{persona}.{pdf|csv}` → `FileResponse` from SAMPLES_DIR (no auth; synthetic files only).
- Test: accept → advance 5 days → a T−2 reminder exists → pay → status PAID.

### 2.6 Wellness + goals

- `GET /wellness/weekly?weeks=4` → `scoring.weekly_breakdown` + `"nudges": scoring.nudges(txns, clock.today(), latest_goal_dict)`.
- `POST /goals` `{name 1–40 chars, target_paise 500..10,000,000}`:
  - `weekly_target_paise = max(2000, round_to_1000(0.10 × median_weekly_surplus_paise))`, where `median_weekly_surplus_paise` comes from `scoring.affordability` (₹10 = 1000 paise).
  - `weeks_left = ceil(target / weekly_target)`; `saved_paise = 0`.
- `GET /goals`.
- **Sync.**

### 2.7 Sharing + fairness

- `POST /shares` `{lender_id}`: needs an ACTIVE consent; idempotent per lender. Audit `SHARED_WITH_LENDER` (purpose "loan application").
- `DELETE /shares/{id}`: sets `revoked_at`. Audit.
- `GET /lenders`.
- `GET /fairness/report`:
  - for the 4 personas, `ingest.parse_statement` on `SAMPLES_DIR/<p>.aa.json` → `{"raw": raw, "owner_name": display_name}`;
  - `scoring.fairness_report(personas, hmac_key)`;
  - cache the result in memory for 10 minutes;
  - no auth needed (synthetic data only).
- **Seed upgrade:** `seed(with_data=True)` loads Sunita, Arjun and Meena via the AA pipeline, each with an auto-created ACTIVE consent, and shares them with all 3 lenders. Ravi stays empty for the live demo.

### 2.8 Full flow test + sync

`test_api_flow.py` extended: login → consent → locked PDF upload → recategorise → score → stress → offers → accept → advance clock → reminder → pay → share with Alpha → wellness → goal → revoke → 0 transactions + audit has every action.

**Sync. Post:** "backend Phase 2 complete".

**If you are behind at 01:45:** cut 2.6 goals (keep wellness), keep 2.7 fairness, tell Mihir.

---

## Phase 3: Lender side + Postgres + Demo 2 (02:15 → 02:55)

**Paste this prompt** (after `/clear`):

```
I am Sanskar. Re-read Phase 3 of tasks/03_SANSKAR_BACKEND.md and CONTRACTS §5 lender rows. Do 3.1 → 3.4, tests for each, commit only my paths, sync.
```

- [x] **3.1 Lender API.**
  - `GET /lender/applicants` (role LENDER): users with an active share to this lender.
  - Per applicant:
    - `applicant_ref = "APP-" + sha256(user_id + lender_id)[:4].upper()`
    - latest score, band, confidence, reason **codes**, `safe_weekly_paise`
    - `requested_paise` (their latest offer request, or 1,000,000)
    - `eligible` computed with that lender's current rules.
  - **One audit row per applicant viewed** (`VIEW_SCORE_SUMMARY`, actor = the lender name, subject = the user).
  - Remove the `xfail` from the key-check test.
- [x] **3.2** `PUT /lender/rules` `{min_band, max_amount_paise, min_weeks}`: store the rules on the lender, then return `{rules, eligible_before, eligible_after}` (eligibility counted over its applicants before and after).
- [x] **3.3** Postgres run: `docker compose up -d db`, then
  ```bash
  DATABASE_URL=postgresql+psycopg://sahayak:sahayak@localhost:5432/sahayakfin python -m pytest -q tests/test_api_flow.py
  ```
  Fix type issues. If Docker isn't available, note that and move on.
  > Done: all API tests pass on PostgreSQL 16, no type fixes needed. On this laptop a local Windows PostgreSQL
  > already listens on 5432/5433, so run the container on another port, e.g. `docker run -d --rm -p 127.0.0.1:55432:5432
  > -e POSTGRES_USER=sahayak -e POSTGRES_PASSWORD=sahayak -e POSTGRES_DB=sahayakfin postgres:16`.
- [x] **3.4** `python -m app.seed --reset` (drop all + create + seed with data) and the README run steps (both DBs, demo logins, passwords, the demo script link). **Sync.**
- [ ] **3.5 Demo 2 at 02:45** on your laptop. Anything broken goes into item 0 of your night prompt.

---

## Phase 4: NIGHT prompt (start 02:55)

```
You are working unattended overnight on SahayakFin as Sanskar's assistant. Nobody will answer until 07:00, so never wait; if blocked after 2 attempts, note it in NIGHT_LOG_SANSKAR.md and move on.
Setup: git fetch origin && git checkout -b night/sanskar origin/main ; git config user.name "Sanskar <SURNAME>" ; git config user.email "<SANSKAR_GITHUB_EMAIL>" ; git config core.hooksPath .githooks ; cd backend && pip install -r requirements.txt && cd ..
Read CLAUDE.md, docs/CONTRACTS.md, docs/PRODUCT.md and tasks/03_SANSKAR_BACKEND.md. Only edit Sanskar's paths (CONTRACTS §0). Never push to main. Never add AI attribution to commits.
Work in this order, committing after each and pushing with `git push -u origin night/sanskar`:
0. Fix these Demo-2 issues first: <PASTE YOUR DEMO-2 ISSUES HERE, or "none">.
1. Any unticked Phase 1–3 items.
2. Security test suite (tests/test_api_security.py): oversized file, wrong extension, PDF with /JavaScript, expired consent deletes data, IDOR on every user-scoped route, lender JSON key check, OTP rate limit, revoked consent blocks upload and AA fetch, JWT tampering (changed role claim) rejected, password never in logs. All must pass.
3. Robustness: every endpoint returns the {"error":{...}} shape (add a test that hits 5 error cases); startup works if SAMPLES_DIR is missing (clear log message); request timing log line without bodies.
4. docs/ARCHITECTURE.md: Mermaid component diagram (frontend, API modules, ingest/scoring/finance, mock AA, DB), Mermaid ER diagram of all tables, Mermaid sequence diagram upload → score → offers → accept, full API table, security controls table mapped to DPDP Act principles (notice, purpose limitation, minimisation, storage limitation, erasure, security safeguards), data lifecycle table (collect → validate → parse in memory → mask → encrypt → store → share summary → delete).
5. docs/PITCH.md: 8-slide outline with speaker notes (1 problem with numbers from NITI Aayog 2022, 2 Ravi's story, 3 solution flow, 4 the score + "steady beats rich" proof, 5 bad-week affordability + KFS true cost, 6 privacy by design, 7 architecture, 8 impact and next steps) + the 5-minute demo script from PRODUCT §6 with exact clicks; use {{placeholders}} for persona numbers.
6. Full test suite green; fix only your paths; others → HANDOFF.md.
7. NIGHT_LOG_SANSKAR.md: done / not done / how to verify.
```

## Phase 5: Morning (07:00 → 08:00)

1. Merge `night/sanskar` after tests pass.
2. `python -m app.seed --reset` on the demo laptop.
3. Fill the `{{numbers}}` in `docs/PITCH.md` from Rajat's night log.
4. Keep the backend running for the final demo.

If the team wants a slide deck, paste `docs/PITCH.md` into the planning chat and ask Claude to build it.

## Troubleshooting (your area)

| Symptom | Fix |
| --- | --- |
| CORS error in the browser | Mihir uses the Vite proxy `/api` → 8000, so requests are same-origin; check `FRONTEND_ORIGIN=http://localhost:5173` |
| Cascade doesn't delete on SQLite | `PRAGMA foreign_keys=ON` in a `connect` event listener |
| `ModuleNotFoundError: app` in tests | Run `python -m pytest` from `backend/` (adds cwd to the path), or add `pythonpath = .` in `backend/pytest.ini` |
| Multipart upload 422 | `python-multipart` installed; endpoint uses `file: UploadFile = File(...)`, `consent_id: str = Form(...)`, `password: str \| None = Form(None)` |
| JSON column error on Postgres | Use `sqlalchemy.JSON` (generic), not `sqlite.JSON` |
