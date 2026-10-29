# SahayakFin — instructions for every Claude Code session

SahayakFin is a hackathon prototype (Fintech & Financial Inclusion track). It reads a gig worker's bank statement and turns it into a fair, explainable **Financial Trust Score** (0–100). It then offers only micro-loans the worker can repay in their own bad weeks, with weekly instalments, a KFS-style loan cost card, sachet insurance, repayment reminders and a weekly spending dashboard. Consent is AA-style and can be revoked, which deletes the data.

Three people build it at the same time, each with their own Claude Code session.

- **First full demo:** 00:30 IST.
- **Final deadline:** 08:00 IST.
- Work in the phases of your task file. Speed and zero merge conflicts matter more than perfection.

- Full product spec: `docs/PRODUCT.md`. Read the sections relevant to your task before you build.
- Team process, clock and git workflow: `docs/TEAM_PLAN.md`.
- Your personal task list: `tasks/0X_<NAME>_*.md`. The human will tell you which file is theirs.
- Contracts (schemas, interfaces, API, test vectors), imported below. **These are the source of truth.** If code and contract disagree, the contract wins. Contracts are never changed silently.

@docs/CONTRACTS.md

## Golden rules (non-negotiable)

1. **Stay in your lane.** Edit only the paths your task file says you own (ownership table in `docs/CONTRACTS.md` §0).
   - If you need a change in someone else's path, STOP. Write the exact request in `HANDOFF.md` under that owner's heading, and tell your human.
   - Never "quickly fix" another owner's file.
2. **Commits are by the human only.** Never add `Co-Authored-By`, `Generated with Claude Code`, `🤖`, `Claude-Session:` or any other AI attribution to commit messages or PR descriptions.
   - Commit messages are short and imperative, e.g. `scoring: add bill discipline component`.
   - Before your first commit in a session, check `git config user.name` and `git config core.hooksPath`. The hooks path must be `.githooks`; if it isn't, run `git config core.hooksPath .githooks`.
3. **Git hygiene.**
   - Commit small and often.
   - Before every push: `git pull --rebase origin main`, then run your tests.
   - Never `git push --force` to `main`. Never `git reset --hard` without the human's OK.
   - Never commit `.env`, `node_modules/`, `__pycache__/`, `*.db` or real personal data.
4. **Don't touch shared files** (`CLAUDE.md`, `docs/CONTRACTS.md`, `.claude/settings.json`, `.githooks/*`, `backend/requirements.txt`, `frontend/package.json`) unless your task file says you own them. Lockfiles are regenerated only by their owner.
5. **No real data, no real integrations.** All data is synthetic. No real bank, AA, SMS or WhatsApp calls. No secrets in code; read them from env (`.env.example` lists them).
6. **Keep the demo path working.** `main` must always run. If you break it, fixing it is your top priority.
7. **Tests are the spec for maths.** Scoring and loan math must pass the golden vectors in `docs/CONTRACTS.md` §7.
8. **Plain language in the UI.** The users are first-time digital banking users. Show rupees, not jargon. Every UI string goes through i18n (en / hi / mr).
9. **When blocked:** after 2 failed attempts at the same error, stop. Write a short summary of the error and what you tried, so the human can paste it into the team's shared chat.

## How to run

- Backend: `cd backend && python -m venv .venv && source .venv/bin/activate` (Windows: `.venv\Scripts\activate`), then `pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000`
- Backend tests: `cd backend && python -m pytest -q`
- Frontend: `cd frontend && npm install && npm run dev` (port 5173; Vite proxies `/api` to `http://localhost:8000`)
- Database:
  - Default for development is SQLite (`DATABASE_URL=sqlite:///./sahayakfin.db`).
  - For the demo, use PostgreSQL via `docker compose up -d db` and `DATABASE_URL=postgresql+psycopg://sahayak:sahayak@localhost:5432/sahayakfin`.
  - Code must work on both: use SQLAlchemy generic types (`JSON`, not `JSONB`).
- Sample data: `python data/generate_personas.py` writes CSV, PDF, locked PDF and AA JSON files to `data/samples/`.
