# SahayakFin architecture

A React phone-frame app and a desktop lender/fairness view talk to one FastAPI service (`/api/v1`). The service owns
auth, consent, storage, security and audit, and calls a **pure, unit-tested** Python package for parsing, scoring and
loan maths. Nothing in the API computes a score itself. Data lives in PostgreSQL (SQLite for development).

## 1. Components

```mermaid
flowchart LR
  subgraph Browser
    U["User app (React, phone frame)<br/>en / hi / mr"]
    L["Lender dashboard + Fairness Lab<br/>(desktop)"]
  end

  subgraph API["FastAPI · /api/v1 (backend/app)"]
    direction TB
    SEC["security/<br/>JWT · roles · AES-GCM · phone hash<br/>OTP rate limit · upload guard"]
    R1["auth · me · consents · privacy (audit, shares)"]
    R2["statements · aa · transactions"]
    R3["scores · affordability · offers · loans · reminders"]
    R4["wellness · goals · fairness · lender · demo"]
    SVC["services/<br/>pipeline · txn_store · scoring_service<br/>consent_sweep · audit · reminders · clock"]
  end

  subgraph Engine["Pure functions (no DB, no HTTP)"]
    ING["app.ingest<br/>parse_statement · normalize · recategorize"]
    SCO["app.scoring<br/>compute_score · affordability · stress_test<br/>weekly_breakdown · nudges · what_if · fairness_report"]
    FIN["app.finance<br/>kfs · loan_max · match_offers · schedule"]
  end

  AA["Mock AA / FIP<br/>data/samples/*.aa.json"]
  DB[("PostgreSQL / SQLite")]

  U -- "JSON + Bearer JWT" --> API
  L -- "JSON + Bearer JWT (LENDER)" --> API
  R1 & R2 & R3 & R4 --> SVC
  SVC --> ING & SCO & FIN
  R2 -- "consent-gated fetch" --> AA
  SVC --> DB
```

The frontend's Vite dev server proxies `/api` to port 8000, so requests are same-origin. CORS is limited to
`FRONTEND_ORIGIN` as a second guard.

## 2. Data model (CONTRACTS §6)

```mermaid
erDiagram
  users ||--o{ consents : gives
  users ||--o{ score_runs : has
  users ||--o{ offers : receives
  users ||--o{ loans : takes
  users ||--o{ goals : sets
  users ||--o{ lender_shares : grants
  users }o--o| lenders : "works for (LENDER role)"
  consents ||--o{ data_sources : "ON DELETE CASCADE"
  data_sources ||--o{ transactions : "ON DELETE CASCADE"
  lenders ||--o{ products : offers
  lenders ||--o{ lender_shares : "is shared with"
  products ||--o{ offers : "priced by"
  score_runs ||--o{ offers : "based on"
  offers ||--o| loans : "accepted as"
  loans ||--o{ repayments : "ON DELETE CASCADE"
  repayments ||--o{ reminders : "ON DELETE CASCADE"

  users { string id PK
          string phone_hash "sha256(secret + phone)"
          string phone_last4
          string display_name
          string role "USER | LENDER"
          string lender_id FK
          string language
          string persona_slug }
  consents { string id PK
             string user_id FK
             string purpose
             json fi_types
             date range_from
             date range_to
             int data_life_days
             string status "ACTIVE | REVOKED | EXPIRED"
             datetime expires_at }
  data_sources { string id PK
                 string consent_id FK
                 string kind "PDF | CSV | AA"
                 string file_sha256 "only trace of the file"
                 date period_from
                 date period_to
                 int weeks_covered }
  transactions { string id PK
                 string source_id FK
                 date txn_date
                 bigint amount_paise
                 string narration_enc "AES-256-GCM"
                 string payee_token "HMAC"
                 string category
                 string kind
                 json flags
                 bool user_corrected }
  score_runs { string id PK
               int score
               string band
               string confidence
               json result }
  lenders { string id PK
            string name
            string min_band
            int min_weeks
            bigint max_amount_paise }
  products { string id PK
             string kind "LOAN | INSURANCE"
             bigint min_paise
             bigint max_paise
             float rate_pct
             float fee_pct
             json tenures }
  offers { string id PK
           bigint amount_paise
           bigint requested_paise
           int weeks
           json kfs
           string eligible
           string status }
  loans { string id PK
          bigint principal_paise
          bigint instalment_paise
          int weeks
          date start_date
          string payout_weekday }
  repayments { string id PK
               int seq
               date due_date
               bigint amount_paise
               datetime paid_at }
  reminders { string id PK
              string code
              json params
              datetime send_at
              bool sent }
  goals { string id PK
          bigint target_paise
          bigint weekly_target_paise
          bigint saved_paise }
  lender_shares { string id PK
                  string consent_id FK
                  datetime revoked_at }
  audit_log { string id PK
              datetime ts
              string actor_role
              string actor_name
              string subject_user_id
              string action
              string purpose }
```

Money is `BIGINT` paise everywhere. JSON columns use the generic SQLAlchemy `JSON` type so the same models run on
SQLite and PostgreSQL (`python -m pytest` passes on both). `audit_log` is insert-only and has no foreign key, so the
diary survives data deletion.

## 3. Upload → score → offers → accept

```mermaid
sequenceDiagram
  autonumber
  actor W as Worker (app)
  participant API as FastAPI
  participant G as upload_guard
  participant I as app.ingest
  participant S as app.scoring
  participant F as app.finance
  participant DB as Database

  W->>API: POST /statements (file, consent_id, password?)
  API->>DB: consent ACTIVE and owned by user?
  API->>G: validate_upload(bytes) size ≤ 5 MB, signature, no /JavaScript, ≤ 20 pages
  API->>I: parse_statement(bytes, password) [READ, in memory only]
  API->>I: normalize(raw, owner, hmac_key) [MASK + CATEGORISE]
  API->>DB: data_sources(sha256) + transactions(narration AES-GCM)
  API->>S: compute_score(txns) [SCORE]
  API->>DB: score_runs + audit STATEMENT_UPLOADED
  API-->>W: StatementResult (stages with ms, score). The bytes and password are dropped.

  W->>API: GET /offers?requested_paise=1000000
  API->>S: affordability(txns) gives safe_weekly and payout_weekday
  API->>F: match_offers(score, afford, lenders, products)
  API->>DB: offers (status OFFERED)
  API-->>W: loans with KFS + insurance

  W->>API: POST /offers/{id}/accept {amount, weeks}
  API->>F: kfs(amount, rate, fee, weeks): instalment ≤ safe_weekly?
  API->>F: schedule(start = today, payout_weekday)
  API->>DB: loans + repayments, offer ACCEPTED, audit LOAN_ACCEPTED
  API-->>W: Loan with weekly schedule
```

## 4. API

All routes are under `/api/v1`. Errors are always `{"error": {"code", "message"}}`. Auth is `Authorization: Bearer <jwt>`
except where marked "public".

| Method | Path | Who | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | public | Liveness |
| POST | `/auth/otp/request` | public | Demo OTP (5 per minute per phone) |
| POST | `/auth/otp/verify` | public | Login, creates the user if new → JWT |
| GET / PATCH | `/me` | user | Profile + flags `has_active_consent`, `has_score`, `has_loan` / language |
| POST / GET | `/consents` | user | Create (purpose, range, data life) / list |
| POST | `/consents/{id}/revoke` | user | Revoke → delete sources + transactions, end shares |
| POST | `/aa/fetch` | user | Simulated Account Aggregator fetch for a demo persona |
| POST | `/statements` | user | Upload PDF (also locked) or CSV |
| GET | `/transactions?weeks=12` | user | Masked transactions grouped by week |
| PATCH | `/transactions/{id}` | user | Change category → rescore |
| POST | `/scores` | user | Recompute score |
| GET | `/scores/latest` | user | Latest score (`consent_revoked: true` after revoke) |
| POST | `/scores/what-if` | user | Effect of one tip |
| GET | `/affordability` | user | Safe weekly instalment, loan max per tenure |
| POST | `/affordability/stress` | user | Income-drop test (10/20/30%) |
| GET | `/offers` | user | Matched loan offers with KFS + sachet insurance |
| POST | `/offers/{id}/accept` | user | Accept → loan + weekly schedule |
| GET | `/loans` | user | Loans with live repayment status |
| POST | `/repayments/{id}/pay` | user | Pay one instalment |
| GET | `/reminders` | user | Sent reminders (chat order) |
| GET | `/wellness/weekly?weeks=4` | user | Weekly spending by category + nudges |
| POST / GET | `/goals` | user | Savings goal |
| GET | `/audit` | user | "Who saw my data" (last 50) |
| GET | `/lenders` | user | Lenders + current share id |
| GET / POST | `/shares` | user | Active shares / share score summary with a lender |
| DELETE | `/shares/{id}` | user | Stop sharing |
| GET | `/lender/applicants` | LENDER | Score summaries of users who shared (audited per view) |
| PUT | `/lender/rules` | LENDER | Change rules → eligible before / after |
| GET | `/fairness/report` | public | Fairness tests on synthetic personas (cached 10 min) |
| POST | `/demo/advance-clock` | user, DEMO_MODE | Move the simulated clock 1–30 days |
| POST | `/demo/reset` | user, DEMO_MODE | Delete the caller's data, reset the clock |
| GET | `/demo/samples/{persona}.{csv,pdf,locked.pdf}` | public | Synthetic sample files |

Interactive docs: `http://localhost:8000/docs`.

## 5. Security controls mapped to DPDP Act 2023 principles

We claim alignment with the principles, not certification.

| DPDP principle | Control in SahayakFin | Where | Tested by |
| --- | --- | --- | --- |
| Notice and consent | Consent object with purpose, date range, data life and fetch type, shown in plain language (en/hi/mr) before any data is read. No upload or AA fetch without an ACTIVE consent owned by the user. | `api/consents.py`, `services/pipeline.py` | `test_no_consent`, `test_revoked_consent_blocks_upload`, `test_revoked_consent_blocks_aa_fetch` |
| Purpose limitation | The only purpose is `LOAN_ASSESSMENT`. Lenders see a score summary only, and only after a per-lender share. | `schemas.ConsentIn`, `api/lender.py` | `test_consent_validation`, `test_lender_sees_only_summary_keys` |
| Data minimisation | The raw file is never stored, only its SHA-256. Account numbers, phones and UPI handles are masked. Names become HMAC payee tokens. Phones are stored as a salted hash + last 4. `TxnOut` never returns the payee token or balance. | `ingest.normalize`, `services/txn_store.py`, `security/hashing.py` | `test_transactions_grouped_and_masked` |
| Storage limitation | Data life of 1–90 days. Consents past `expires_at` become EXPIRED on the next request and their data is deleted. | `services/consent_sweep.py` | `test_expired_consent_deletes_data`, `test_advance_clock_past_data_life_expires` |
| Right to erasure | Revoke deletes data sources and transactions (DB cascade), ends lender shares, and returns the deleted counts. | `api/consents.py` | `test_revoke_returns_counts_and_audits`, `test_full_flow` |
| Security safeguards | AES-256-GCM narrations; JWT HS256 with role checked against the DB; role guards; 404 (not 403) on other users' ids; OTP rate limit; upload size, signature, script and page checks; PDF password used once and never logged; logs contain no bodies or personal data; CORS limited to the frontend. | `security/*`, `main.py` | `test_api_security.py`, `test_api_upload.py` |
| Accountability | Insert-only audit log for consent, upload, recategorise, loan, repayment, share and every lender view, shown to the user. | `services/audit.py`, `GET /audit` | `test_full_flow`, `test_lender_sees_only_summary_keys` |

## 6. Data lifecycle

| Stage | What happens | Where the data is |
| --- | --- | --- |
| Collect | The user gives consent, then uploads a statement or triggers the mock AA fetch | Request memory |
| Validate | Size ≤ 5 MB, `%PDF-` or UTF-8 CSV signature, extension matches, no `/JavaScript` `/JS` `/Launch` `/EmbeddedFile`, ≤ 20 pages | Request memory |
| Parse in memory | `parse_statement` decrypts a locked PDF in memory with the one-time password | Request memory; the password is dropped after |
| Mask | Account numbers, phones and UPI handles are masked; names become `P-XXXXXXXX` HMAC tokens; categorised before masking | Request memory |
| Encrypt + store | Narration encrypted with AES-256-GCM; only the file's SHA-256 is kept | `data_sources`, `transactions` |
| Score | Pure engine over stored, masked transactions | `score_runs` (kept as a lending record) |
| Share summary | Per-lender share; the lender sees band, score, confidence, reason codes and safe weekly amount, under an `APP-XXXX` reference | `lender_shares`; each view goes to `audit_log` |
| Delete | Revoke or expiry deletes sources → transactions and ends shares; `/demo/reset` clears everything for the user | Gone. The audit row records it. |

## 7. Running

See `README.md`. Short version: `cd backend && uvicorn app.main:app --reload --port 8000`, and
`python -m app.seed --reset` before a demo.
