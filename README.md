# SahayakFin

Alternative credit scoring and financial wellness for gig workers (hackathon prototype). All data is synthetic.

- Product: `docs/PRODUCT.md` · Contracts: `docs/CONTRACTS.md` · Team plan: `docs/TEAM_PLAN.md`
- Architecture, API and DPDP mapping: `docs/ARCHITECTURE.md` · Pitch + 5-minute demo script: `docs/PITCH.md`

## Run the backend

**SQLite is the default** in `.env.example` and needs no Docker. PostgreSQL is optional; follow the Windows section below when selecting it. All OTP, AA fetch and payment flows are synthetic demos.

```bash
cp .env.example .env                       # demo-only values; never commit .env
cd backend
python -m venv .venv
source .venv/bin/activate                  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000  # http://localhost:8000/docs
```

Startup creates the tables and seeds lenders, products, insurance and the demo users. If `data/samples/` exists,
Sunita, Arjun and Meena are also loaded through the AA pipeline and shared with all 3 lenders (`SEED_DEMO_DATA=true`).
Ravi stays empty for the live demo.

- Destructive reset: `python -m app.seed --reset` drops every table. Use only on a confirmed expendable local demo database; never shared/staging/production.
- Tests: `python -m pytest -q`
- PostgreSQL instead of SQLite:
  ```bash
  docker compose up -d db
  DATABASE_URL=postgresql+psycopg://sahayak:sahayak@localhost:5432/sahayakfin uvicorn app.main:app --port 8000
  ```
  If a local PostgreSQL already uses port 5432, map the container to another port (e.g. `55432:5432`) and change the URL.

## Demo logins (OTP is always `123456`)

| Phone | Who |
| --- | --- |
| 9000000001 | Ravi Shinde (empty, for the live demo) |
| 9000000002 / 9000000003 / 9000000004 | Sunita / Arjun / Meena (pre-loaded when samples exist) |
| 9999999991 / 9999999992 / 9999999993 | MFI Alpha / Beta / Gamma (lender dashboard) |

Locked PDF passwords: first 4 letters of the name in capitals + `0101`, e.g. `RAVI0101`.

## Run the frontend

Use Node 20+ and run `npm ci`, then `npm run dev` from `frontend/` (port 5173; Vite proxies `/api` to port 8000).

For the real backend, set `VITE_USE_MOCKS=false` in the gitignored `frontend/.env.development.local` and restart Vite. Check browser network requests use `/api/v1` and return backend JSON. The checked-in development default enables mocks. Run `npm run build` and `npm run check-i18n` before the demo; starting the site alone is not proof those checks passed.

## Sample data

`python data/generate_personas.py` writes CSV, PDF, locked PDF and AA JSON files to `data/samples/`.


## Windows PowerShell: PostgreSQL live demo

The template defaults to **SQLite**. Starting Docker alone does not select PostgreSQL.
Use Docker Desktop with Linux containers. From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose up -d db
docker compose ps
```

In root `.env`, replace the SQLite URL with:

```env
DATABASE_URL=postgresql+psycopg://sahayak:sahayak@localhost:5432/sahayakfin
DEMO_MODE=true
SEED_DEMO_DATA=true
FRONTEND_ORIGIN=http://localhost:5173
SAMPLES_DIR=../data/samples
```

For a new empty database, generate local secrets and put the results in `.env`:

```powershell
.\.venv\Scripts\python.exe -c "import base64,secrets; print('DATA_KEY='+base64.b64encode(secrets.token_bytes(32)).decode()); print('JWT_SECRET='+secrets.token_urlsafe(48)); print('PAYEE_HMAC_KEY='+secrets.token_urlsafe(48))"
```

Keep `.env` uncommitted. Existing encrypted data requires its original DATA_KEY; changing it makes those rows unreadable.
Compose credentials and template secrets are for synthetic local demos only. On Windows, use `127.0.0.1` instead of `localhost` if IPv6 resolution delays connections. A deployed system needs managed secrets,
strong database credentials, TLS, migrations, and a real authentication service. Demo OTP, AA fetch and payments are simulations.

Samples are already tracked. Do not regenerate customized fixtures; inspect `data/generate_personas.py` before running it.
Start the backend and confirm the effective dialect without printing its connection URL:

```powershell
Set-Location backend
..\.venv\Scripts\python.exe -c "from app.db import engine; print(engine.dialect.name)"
..\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
# In another terminal:
Invoke-RestMethod http://localhost:8000/api/v1/health
```

The dialect must print `postgresql`; health must return `ok: true`. Interactive docs: http://localhost:8000/docs.
Startup creates tables and seeds the other three personas; Ravi stays empty. A missing samples directory logs a warning.
The Docker volume retains rows across backend restarts.

For the live demo, create the gitignored
`frontend/.env.development.local` containing `VITE_USE_MOCKS=false`, restart Vite, then run `npm ci`,
`npm run build`, `npm run check-i18n`, and `npm run dev`. Verify browser network requests use `/api/v1`
and return backend JSON. The checked-in frontend development setting enables mocks.

Demo sequence: Ravi login / OTP 123456 -> consent -> locked PDF / RAVI0101 -> score -> stress -> offers ->
accept -> 26 repayments -> advance clock / simulated payment -> share with Alpha -> lender view -> revoke.
Revoke deletes sources and transactions and ends lender shares. The user's historical scores and loans remain
as lending records; this prototype does not implement a production retention schedule.

### Isolated database tests

Tests ignore the application DATABASE_URL and default to temporary SQLite. To test PostgreSQL, explicitly provide
TEST_DATABASE_URL naming a disposable database ending in `_test` or starting with `test_` / `sahayakfin_test_`.
The test harness creates a unique schema, removes it afterward and never uses public demo tables.
For a local Compose database, first create a separate test database:

```powershell
docker compose exec db createdb -U sahayak sahayakfin_test_sanskar
Set-Location backend
..\.venv\Scripts\python.exe -m pytest -q
$env:TEST_DATABASE_URL = 'postgresql+psycopg://sahayak:sahayak@localhost:5432/sahayakfin_test_sanskar'
..\.venv\Scripts\python.exe -m pytest -q
Remove-Item Env:TEST_DATABASE_URL
```

If that test database already exists, reuse it; each test session has its own schema. Do not supply a shared or
production database, even with a test-like name.

### Troubleshooting and integration

- Port 5432 occupied: set `POSTGRES_PORT=55432` in root `.env`, update DATABASE_URL to port 55432 and restart Compose.
- Port 8000 occupied: stop the old backend; Vite's existing proxy expects 8000.
- Port 5173 occupied: stop the old frontend or agree a new origin and update FRONTEND_ORIGIN.
- `NO_SCORE`: give consent and upload or fetch a statement first. Mocks do not populate backend state.
- Never run `scripts/sync.sh`: it pushes to main. The integrator must fix that shared script separately.
- Work branches target `integration/full-demo`; do not push directly to main or the integration branch.


## Verified demo numbers (30 October 2026)

Evidence: `SANSKAR_INTEGRATION_REPORT.md` and Rajat's `RAJAT_VERIFICATION_REPORT.md` on `work/rajat-scoring-verify`. These reports cover separate revisions, not a future merged release.

| Item | Verified synthetic result |
| --- | --- |
| Ravi | 284 transactions; 85 STRONG; HIGH confidence; ₹295.29 safe weekly; ₹7,200 safe loan |
| MFI Alpha | ₹7,056 received; ₹294.51/week (about ₹295); total ₹7,657.22; cost ₹601.22; advertised 24%, calculated APR 32% |
| MFI Beta / Gamma | Beta APR 25%; Gamma unavailable because matched amount is below minimum |
| Alpha schedule | 26 Fridays, starting 6 November 2026 when the demo clock is 30 October 2026; final repayment reconciles rounding |
| Stress at 0/10/20/30% income drop | 10/9/6/3 of 12 weeks covered; GREEN with buffer coverage |
| Sunita / Arjun / Meena | 99 / 43 (₹0 safe weekly, no loan) / 94 (provisional, LOW confidence) |
| Privacy / fairness | Revoke deletes 284 transactions and ends sharing; 8/8 supplied-persona fairness tests pass |

Reclassifying transactions or advancing the clock can change the live result or schedule. Retained scores and lending records are not deleted by consent revocation. See the pitch for the rehearsal script; browser tests, recording and submission need their own evidence.
