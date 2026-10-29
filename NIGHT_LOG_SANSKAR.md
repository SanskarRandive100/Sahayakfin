# Night log: Sanskar (backend)

Branch: `sanskar/backend` (not merged to `main`; merge with `git merge --no-ff origin/sanskar/backend` after review).

## Done

- **Phase 1–3 backend:** all endpoints in CONTRACTS §5, all 14 tables of §6, seed (`python -m app.seed --reset`),
  lender applicants + rules, Fairness Lab with a 10-minute cache.
- **Security suite** (`tests/test_api_security.py`, `test_api_upload.py`): oversized file, wrong extension, PDF with
  `/JavaScript`, too many pages, expired consent deletes data, IDOR on transactions, consents, offers, repayments and
  shares (404), lender JSON key check, OTP rate limit, revoked consent blocks upload and AA fetch, JWT tampering
  (wrong key, `none` algorithm, role claim not matching the DB), PDF password never in logs.
- **Robustness:** one error shape on every path (test hits 6 cases), startup logs a clear warning if `SAMPLES_DIR` is
  missing, a parser crash becomes `UNSUPPORTED_FILE` instead of a 500, request timing log without bodies.
- **Real-data checks** (`tests/test_api_personas.py`): Ravi CSV → 85 STRONG HIGH, 284 txns, safe ₹7,200, Alpha and
  Beta ELIGIBLE, Gamma OUTSIDE (BELOW_MIN_AMOUNT), Alpha APR 32%, Friday schedule, revoke deletes 284; AA fetch gives
  the same score as the CSV; seeded Sunita/Arjun/Meena within the §7 ranges; the fairness report is all green.
- **PostgreSQL (3.3):** the whole API suite passes on PostgreSQL 16 with no changes.
- **Docs:** `docs/ARCHITECTURE.md` (Mermaid component, ER and sequence diagrams, API table, DPDP mapping,
  data lifecycle) and `docs/PITCH.md` (8 slides with notes + the 5-minute demo script with real numbers).

## Not done / needs a human

- 1.6 and 3.5: running the demo on the laptop with Mihir's frontend (`VITE_USE_MOCKS=false`).
- `docs/PITCH.md`: one `{{...}}` item still needs a source (informal lending rate); verify the
  NITI Aayog figures before the slide.
- `scripts/sync.sh` (shared file) lists `backend/app/deps.py` but not `backend/app/errors.py`, so future edits to
  `errors.py` won't be staged by sync. Add it, after announcing the change in the team chat.
- PRODUCT §6 still has the old demo numbers (₹7,600 / ₹7,350 / 214 / amber). PITCH.md lists the real ones.

## How to verify

```bash
cd backend
python -m pytest -q                       # SQLite
docker run -d --rm --name pg -p 127.0.0.1:55432:5432 -e POSTGRES_USER=sahayak -e POSTGRES_PASSWORD=sahayak \
  -e POSTGRES_DB=sahayakfin postgres:16
DATABASE_URL=postgresql+psycopg://sahayak:sahayak@127.0.0.1:55432/sahayakfin python -m pytest -q
python -m app.seed --reset && uvicorn app.main:app --port 8000   # then open http://localhost:8000/docs
```
