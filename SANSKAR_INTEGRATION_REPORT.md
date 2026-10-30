# Sanskar integration verification - 30 October 2026 (IST)

## Revision and environment

- Baseline: `bba49759f4adaa2a8e3b11d078de6b99977d1ba4` (`origin/integration/full-demo`).
- Branch: `work/sanskar-backend-postgres`.
- Tested implementation revision: `254bc6012a925493b0fac2eb5683125c6aba074a`. The subsequent report commit adds evidence only.
- Worktree: `C:/Users/HP/Desktop/sahayakfin-sanskar-postgres`; original worktree and its five untracked files preserved.
- OS: Windows-11-10.0.26200-SP0; Python 3.14.4.
- PostgreSQL: 16.15 (Debian 16.15-1.pgdg13+2); psycopg 3.3.6; SQLAlchemy 2.1.6.
- Effective dialect: `postgresql` (also logged on backend startup without URL/secrets).
- Dedicated verification container: `sahayakfin-sanskar-verification`, image `postgres:16`, running on loopback port 55434.
- Live database: `sahayakfin_demo`; separate tests: `sahayakfin_test_sanskar`.
- The existing Compose service was stopped and was left untouched. Verification used a separate container, not the existing demo volume.
- `docker compose config --quiet`: passed for the updated Compose file. Compose readiness check was added; an actual `docker compose up` was not used for this isolated run.
- No destructive seed reset was run. Root `.env` contains generated local secrets and is gitignored; no secrets are committed.

## Executed tests

| Run | Passed | Failed | Skipped | Duration |
| --- | ---: | ---: | ---: | --- |
| Full SQLite suite | 243 | 0 | 0 | 74.59s |
| Full isolated PostgreSQL suite | 243 | 0 | 0 | 82.58s |

Commands from backend:

```powershell
..\.venv\Scripts\python.exe -m pytest -q
$env:TEST_DATABASE_URL = 'postgresql+psycopg://sahayak:sahayak@127.0.0.1:55434/sahayakfin_test_sanskar?connect_timeout=5'
..\.venv\Scripts\python.exe -m pytest -q
```

Both suites reported two warnings: Starlette deprecates its httpx TestClient integration, and the deliberately
wrong JWT key in the tampering test triggers a short-key warning. Neither is a failing test or an unexplained skip.
Dependencies were installed from the existing requirements in a dedicated ignored virtual environment.

Before fixes, targeted regressions reproduced **3 failures / 21 passes**: public sample download outside demo mode,
new quote IDs on every refresh, and successful acceptance after the lender raised its minimum history above the user's.

An initial system-Python run stopped at missing NumPy. The dedicated environment resolved it. Initial localhost
PostgreSQL runs stalled on this Windows machine; those runs were interrupted and repeated successfully using
127.0.0.1 with a five-second connect timeout. One schema from an interrupted run remains in the disposable test
DB (`test_5827ea1a83b24301873ca95ca3619699`); successful runs clean up their own unique schemas.

## Live HTTP evidence

A real Uvicorn server ran on loopback port 18000 with PostgreSQL, independently of TestClient. It was stopped
after verification. The container and ignored local configuration remain available. Local raw evidence is in
`.venv/live-result.json` and `.venv/backend-verification.log` (ignored, not part of the PR).

- Health: `{"ok": true}`; startup logged `Database dialect: postgresql`.
- Seed: 7 users, 3 lenders, 6 products,
  1049 preloaded transactions. Repeated seeding left all counts unchanged. Ravi started empty.
- OTP request/verify and consent creation passed. Bad OTP/rate-limit/JWT role and expiry rejection are covered by the suites.
- Locked Ravi PDF returned `PDF_PASSWORD_REQUIRED` without a password; `RAVI0101` succeeded.
- Ravi: 284 transactions, score 85, STRONG,
  HIGH confidence; safe weekly 29529 paise; safe loan
  720000 paise (Rs 7,200).
- Alpha and Beta were eligible. Alpha: 29,451 paise/week, 705,600 paise received, 765,722 paise total repayment,
  60,122 paise cost, 32.0% calculated APR. Beta: 29,227 paise/week, 25.0% calculated APR.
- Alpha acceptance produced 26 Friday rows, first due 2026-11-06.
  Simulated payment changed the first repayment to PAID.
- Stress shocks 0, .1, .2, .3 all returned GREEN with buffer coverage; covered weeks were
  10, 9, 6, 3 of 12, respectively. Full series returned.
- Clock advanced five days. Zero live reminders were returned because the first repayment was already paid;
  the API flow suite separately verifies an unpaid T-minus-2 reminder and payment afterward.
- Wellness and goal creation passed. Backend process restart preserved row counts, Ravi score, the loan and goal ID.
  This verifies backend restart persistence, not a Docker volume restart (the verification container uses its own storage).
- Lender fields: `applicant_ref, band, confidence, eligible, reasons, requested_paise, safe_weekly_paise, score`. No personal/transaction fields returned.
- Share and lender view passed; audit includes actor MFI Alpha and VIEW_SCORE_SUMMARY. Revocation deleted
  284 transactions and 1 source, removed active shares and reduced Alpha's
  applicants from four to 3.
- After revoke, transactions were empty, offers returned NO_SCORE, and the owner's retained latest score had consent_revoked=true.
- Separate synthetic account AA fetch: 284 transactions, score 85, kind AA.
- All 8 fairness statuses passed, not just HTTP 200. Scores: Ravi 85, Sunita 99, Arjun 43, Meena 94 (LOW confidence).
- Full suites also exercise recategorization, goals, upload limits/scripts/passwords, IDOR, consent expiry and encrypted narration/key validation.

## Changes and compatibility

- Demo sample downloads now return the existing NOT_FOUND / 404 error when DEMO_MODE=false; demo UX remains available.
- Sequential unchanged offer refreshes reuse existing OFFERED quote IDs; changed quotes are not overwritten.
- Offer acceptance recomputes score from live consent-backed transactions and checks current lender band/history rules,
  amount/tenure bounds and safe instalment. Smaller amounts within current limits remain supported and tested.
- Tests ignore application DATABASE_URL, require explicit disposable PostgreSQL TEST_DATABASE_URL, and isolate each run
  in a unique schema; SQLite uses a temporary DB with cleanup. Regression subprocesses verify that demo URLs are refused.
- Compose now binds PostgreSQL to loopback, supports POSTGRES_PORT and checks readiness. SQLite remains the template default.
- Startup logs the effective dialect. Windows setup, secrets/key retention, test isolation and troubleshooting documented.
- Architecture and pitch distinguish deletion of source transactions from retained lending records and acknowledge
  framework upload spooling. Unverified pitch statistics/placeholders removed; current test and persona results included.
- No response field formats, reason enums or money/date units changed. No shared contracts edited.

Owned files: `.env.example`, `docker-compose.yml`, `README.md`, `backend/app/main.py`,
`backend/app/api/demo.py`, `backend/app/api/offers.py`, `backend/app/api/statements.py`,
`backend/tests/conftest.py`, `backend/tests/test_api_config.py`, `backend/tests/test_api_offers.py`,
`backend/tests/test_api_security.py`, `docs/ARCHITECTURE.md`, `docs/PITCH.md`,
`tasks/03_SANSKAR_BACKEND.md`, and this report.

## Remaining integration actions / limitations

1. **Mihir:** create ignored frontend/.env.development.local with VITE_USE_MOCKS=false; restart Vite; run npm ci,
   build and check-i18n; verify the browser and lender journeys and network JSON. No frontend files were edited or
   frontend checks run. Browser acceptance is **not verified** by this report.
2. **Integrator:** fix shared scripts/sync.sh in a separate PR; it rebases/pushes main. It was neither edited nor run.
   This remains a release blocker. Shared PRODUCT demo numbers also need owner correction (284 / 85 / Rs 7,200).
3. **Rajat/integrator:** confirm the agreed starting SHA and merge Rajat before this branch, then rerun integration checks.
   No teammate messages were sent and their current branch/baseline has not been confirmed.
4. **Coordinated contract proposal:** four-hex APP references can collide and are deterministic. Longer random per-lender
   references need an agreed API/frontend migration; the contracted format is preserved here.
5. **Production hardening:** concurrent quote generation/acceptance lacks a uniqueness/locking guarantee; sequential
   double acceptance is tested. Derived score/offer/loan/goal/audit retention has no production expiry policy.
6. **Upload limitation:** FastAPI/Starlette multipart processing may spool to disk before the route's bounded read.
   Strict memory-only ingress and encoded PDF-name hardening require a separate upload design; the current lexical
   guard is not a malware sandbox. Documentation no longer claims end-to-end memory-only upload storage.
7. **Deployment:** non-demo mode alone is not production readiness. OTP, AA, payments, fairness examples and identities
   are synthetic. No legal compliance assessment, real bank credentials, real customer data or market claims were added.

Only the isolated work branch is to be pushed. No main/integration merge or direct push is authorized by this report.
