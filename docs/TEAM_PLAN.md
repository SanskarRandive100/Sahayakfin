# How we work tonight (first demo 00:30 · final 08:00 IST)

## The phases (same for all three people)

| Phase | Time (IST) | Goal | Ends with |
| --- | --- | --- | --- |
| **0 Setup** | 22:50 → 23:05 | Repo cloned, Claude Code running, hooks on, contracts read. Skip whatever you already did. | Everyone posts "ready" in the team chat |
| **1 First Demo build** | 23:05 → 00:30 | A thin but **real** end-to-end flow (below) | **00:30 FIRST DEMO** |
| **Review 1** | 00:30 → 00:50 | All three watch the flow on one laptop and write `REVIEW_1.md` | Every change has an owner and a priority |
| **2 Complete product** | 00:50 → 02:15 | All remaining P0 features + Review 1 fixes | **02:15 Checkpoint:** everything on `main`, tests green |
| **3 Polish + P1 + Demo 2** | 02:15 → 02:55 | Lender dashboard, read-aloud, polish; **Demo 2 at 02:45** (10 min) | Night prompts started at 02:55 |
| **4 Night shift** (Claude alone) | 03:00 → 07:00 | Hardening, tests, translations, docs, pitch outline, on `night/<name>` branches | `NIGHT_LOG_<NAME>.md` written |
| **5 Morning** | 07:00 → 08:00 | Merge night work, final demo twice, record backup video, submit | `v1.0` tag, submitted |

**Sleep is 03:00 → 07:00.** Laptops stay plugged in with sleep turned off, or the night runs as cloud sessions.

### What the 00:30 First Demo must show (the "walking skeleton")

It uses the real backend, the real scoring maths and real parsing. English is enough for now; mocks are not allowed in the demo.

1. Language → Login (OTP 123456) → Consent (Allow).
2. Upload `ravi.csv` **and** `ravi.locked.pdf` (password `RAVI0101`).
3. Processing stages animate.
4. Review shows masked transactions by week.
5. Score screen shows the score, band, confidence, 4 bars and 2 reasons.
6. Loans: type ₹10,000 → "Safe for you" → 3 offer cards with the KFS card.
7. Accept → weekly schedule with the correct weekday.
8. Golden tests pass: `cd backend && python -m pytest -q`.

If something isn't ready at 00:30, demo what works, and put the gap at the top of `REVIEW_1.md`. **Don't move the demo.**

### Review 1 (00:30 → 00:50): how to do it

1. One laptop, the whole flow, as if you were the judge. Then try Sunita's and Arjun's files.
2. Write `REVIEW_1.md` at the repo root. One line per issue:
   `| # | Screen/area | Problem | Fix | Owner | MUST/SHOULD/COULD |`
3. **MUST** = breaks the demo or a judging criterion. **SHOULD** = clearly visible to judges. **COULD** = nice to have.
4. **Optional triage:** paste `REVIEW_1.md` into the shared planning chat, and Claude will order it, split it per person and write the exact prompts.
5. Each person copies their own MUST and SHOULD lines into the "Review 1 fixes" box of their task file. Phase 2 starts with those.

### Demo 2 (02:45, 10 minutes)

Run the full PRODUCT §6 script, including Hindi, revoke, Fairness Lab and the lender view. Anything broken becomes the **first item** of that owner's night prompt.

## One-time setup (Phase 0)

1. **Install Claude Code** (docs: https://code.claude.com/docs/en/quickstart):
   - macOS / Linux / WSL: `curl -fsSL https://claude.ai/install.sh | bash`
   - Windows PowerShell: `irm https://claude.ai/install.ps1 | iex`
   - Then run `claude` and log in.
2. Install Git, Python 3.11+ and Node 20+.
3. Get the repo: `git clone <repo-url> sahayakfin && cd sahayakfin`.
4. **Your identity on GitHub:**
   ```bash
   git config user.name "Your Full Name"
   git config user.email "your-github-email"
   ```
5. **Hooks** (they strip AI co-author lines and block `.env`): `bash scripts/setup-dev.sh`. Windows: `powershell -ExecutionPolicy Bypass -File scripts/setup-dev.ps1`.
6. **Open the repo in VS Code** → terminal at the repo root → `claude`. Always start Claude Code from the repo root.
7. **Optional, for cloud night sessions:** connect GitHub on claude.ai/code (install the Claude GitHub App on the repo), or run `/web-setup` in Claude Code.

## Working with Claude Code (all three)

- **Each phase starts fresh:** type `/clear`, then paste that phase's prompt from your task file. A fresh context keeps Claude fast and accurate.
- **One item at a time:** let it finish an item, run the acceptance check, commit, and then move on.
- **If Claude drifts** (edits files you don't own, invents fields), stop it with `Esc` and say: "Follow docs/CONTRACTS.md exactly; only my paths."
- **Model:** use the strongest model for the scoring engine, parser and security code. A faster model is fine for UI copy, translations and docs.
- **Ticking boxes:** tell Claude "tick the boxes you finished in my task file" before each sync.

## Git rules (no conflicts)

1. Each person edits only their own paths (CONTRACTS §0).
2. **Sync** at least every 45 minutes and at every phase end:
   ```bash
   bash scripts/sync.sh frontend|scoring|backend "area: what changed"
   ```
   This commits your paths, runs `pull --rebase --autostash`, runs your tests, then pushes to `main`.
3. Never use `git add .` or `git add -A`. Never force-push to `main`.
4. **Push rejected:** run sync again. **Rebase conflict:** `git rebase --abort` and tell the team chat which file; the owner fixes it.
5. **Shared files:** post "CONTRACT CHANGE: …" first → one person edits → pushes → everyone pulls.
6. **Night work:** on `night/<name>` only. In the morning:
   ```bash
   git checkout main && git pull
   git merge --no-ff origin/night/<name>
   # run tests
   git push
   ```
7. **Commits show only your name.** Check with `git log -3 --format='%an <%ae>%n%B'`.

## Talking to each other

- **Team chat:**
  - "pushed: …" after every sync.
  - "BLOCKED: …" immediately.
  - "CONTRACT CHANGE: …" before touching a shared file.
- **`HANDOFF.md`:** requests for another owner, with the exact function or endpoint and JSON.
- **The shared planning chat with Claude:** for an error Claude Code can't fix in 2 tries, paste:
  1. Your name and phase/item.
  2. The full error.
  3. `git status` and `git log --oneline -5`.
  4. What was already tried.

## Handoff timeline (who gives what to whom, and when)

| Time | From → To | What |
| --- | --- | --- |
| 23:20 | Rajat → Sanskar | Typed stubs for `app.ingest`, `app.scoring`, `app.finance` on `main` |
| 23:50 | Sanskar → Mihir | API live: auth, consent, `/statements`, `/scores/latest`, `/me` |
| 00:00 | Rajat → Sanskar | Real engine + finance on `main` |
| 00:10 | Rajat → all | `data/samples/*` (CSV, PDF, locked PDF, AA JSON for 4 personas) on `main`; Sanskar's tests use an inline CSV until then |
| 00:15 | Sanskar → Mihir | `/offers`, `/offers/{id}/accept`, `/loans` live |
| 00:15 | Mihir | Switch the frontend to the real API (`VITE_USE_MOCKS=false`) |
| 00:25 | Rajat → Sanskar | Real CSV + PDF parsing on `main` |
| 00:25 | All | Everything on `main`; one laptop pulls everything for the demo |
| 01:45 | Rajat → Sanskar | affordability, stress, wellness, nudges, what_if, fairness_report real |
| 02:10 | Sanskar → Mihir | All Phase 2 endpoints live |
