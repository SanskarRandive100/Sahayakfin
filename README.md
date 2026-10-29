# SahayakFin

Alternative credit scoring and financial wellness for gig workers (hackathon prototype). All data is synthetic.

- Product: `docs/PRODUCT.md` · Contracts: `docs/CONTRACTS.md` · Team plan: `docs/TEAM_PLAN.md`
- Architecture, API and DPDP mapping: `docs/ARCHITECTURE.md` · Pitch + 5-minute demo script: `docs/PITCH.md`

## Run the backend

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

- Reset the demo database: `python -m app.seed --reset` (drop all, recreate, seed with persona data).
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
| 9000000002 / 3 / 4 | Sunita / Arjun / Meena (pre-loaded when samples exist) |
| 9999999991 / 2 / 3 | MFI Alpha / Beta / Gamma (lender dashboard) |

Locked PDF passwords: first 4 letters of the name in capitals + `0101`, e.g. `RAVI0101`.

## Run the frontend

`cd frontend && npm install && npm run dev` (port 5173; Vite proxies `/api` to port 8000).

## Sample data

`python data/generate_personas.py` writes CSV, PDF, locked PDF and AA JSON files to `data/samples/`.
