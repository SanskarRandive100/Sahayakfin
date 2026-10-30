# Real-backend worker acceptance

These are synthetic demo tests, not production or real-customer tests.
The worker script resets Ravi's data and the shared simulated clock through the demo
API before each viewport. Use a **dedicated disposable backend/database**. It refuses
to run unless `SAHAYAK_ACCEPTANCE_ALLOW_RESET=true` is explicitly set.

## Reproduce

Install the existing frontend and backend dependencies. Install test tools separately
so the application package and lockfile stay unchanged:

```powershell
npm install --prefix backend/.venv/browser-tools --no-save playwright@1.64.1
node backend/.venv/browser-tools/node_modules/playwright/cli.js install chromium
```

Start a backend with a fresh disposable SQLite database (or dedicated PostgreSQL DB)
and `DEMO_MODE=true`. Start Vite with `VITE_USE_MOCKS=false` in the ignored
`frontend/.env.development.local`; its `/api` proxy must target that backend.
For the standard backend/frontend ports 8000/5173, run from the repository root:

```powershell
$env:SAHAYAK_ACCEPTANCE_ALLOW_RESET='true'
$env:ACCEPTANCE_BASE_URL='http://127.0.0.1:5173'
$env:ACCEPTANCE_BACKEND_URL='http://127.0.0.1:8000'
$env:ACCEPTANCE_LANGUAGE='en'
node data/browser_acceptance/worker-acceptance.cjs
$env:ACCEPTANCE_LANGUAGE='hi'
$env:ACCEPTANCE_VIEWPORT='mobile'
node data/browser_acceptance/worker-acceptance.cjs
```

For this recorded run, the existing 8000/5173 processes were left untouched. An
isolated Uvicorn used 18000 and Vite used 15173 with an explicit proxy to 18000.
The script defaults to those isolated URLs. `PLAYWRIGHT_MODULE` can specify another
installed Playwright module. Output is written under `evidence/<language>/`.

The script exits nonzero on a failed step, unexpected console error, horizontal
overflow or a recorded worker bug. The initial locked-PDF request intentionally
returns `PDF_PASSWORD_REQUIRED`/400; its browser resource-error entry is retained
in the evidence and excluded from unexpected errors. No API responses are mocked
in the worker journey. Score, count, offer and schedule assertions use actual JSON
from the running API. Demo OTP 123456 and all personas are synthetic.

## Recorded coverage

- English: all nine steps at 1440x900 and 390x844.
- Hindi: all nine steps at 390x844 (automated; this does not replace human rehearsal).
- `guard-results.json`: explicit mock badge on three pages with one warning, backend
  health outage/retry and failed-login no-fallback, delayed real offer responses,
  quick loan amounts, zero-amount validation and confirmation cancellation.
- `resume-results.json`: restoring active consent after a fresh login, CSV upload,
  real sample PDF download, back/not-now and category-dialog cancellation.

Guard outage tests deliberately intercept health/login failures; the delayed-offer
test preserves actual backend payloads. These are separate from the real-backend
worker pass. Speech controls were clicked; audible quality requires a human check.
See `RAJAT_FINAL_REPORT.md` for the table, source revision, remaining owner items
and release gate.
