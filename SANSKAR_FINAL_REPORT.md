# Sanskar final browser handoff — 30 October 2026 (IST)

## Completed and measured

Work is on `work/sanskar-final-browser`, based on Rajat's `integration/final` at
`8ace13ea634e46d778fd788ca593645721a931cd`. Tested implementation commit: `c7da9ae40ac65f15d6d2507c1a92ea8ff948acde`. This preserves the user's explicit request for a separate branch.
No main push, release tag, teammate message, cloud upload or submission was performed.

- `npm ci`: completed. Node 24.18.0 is installed; Node 20 was not installed/downgraded.
- `npm run build`: passed; `npm run check-i18n`: passed.
- Full final-baseline backend suite: **311 passed, 0 failed, 0 skipped**, 108.63 seconds, SQLite.
  Two existing warnings concern Starlette's httpx TestClient deprecation and the deliberately wrong short JWT test key.
  The earlier backend baseline had 243 passes on SQLite and PostgreSQL; 311 PostgreSQL tests were not rerun here.
- Chromium/Playwright ran the actual frontend and FastAPI, not intercepted or mock API responses.
- Ignored `frontend/.env.development.local` contains `VITE_USE_MOCKS=false`.
- Frontend: http://127.0.0.1:5173; backend: http://127.0.0.1:8000.
- Browser verification used `.venv/browser-demo.db`. A new untouched `.venv/stage-demo.db` is now running via the ignored root `.env`: Ravi has no consent/score; Sunita 99, Arjun 43 and Meena 94 are preloaded. Health passed. Existing PostgreSQL demo data was not reset.
- Broad matrix checks used the a930bec baseline; the full Hindi journey and build/i18n were repeated after Rajat's worker fixes at 8ace13e. Backend source was unchanged between those two revisions.
- **81 route × viewport × language checks**: 9 routes, 1440×1000 / 390×844 / 768×1024, English/Hindi/Marathi.
  No document horizontal overflow or raw translation keys; no JavaScript page exceptions.
- **36 additional app/mobile checks** after applying 44px control targets: 6 app routes, 2 mobile/tablet sizes,
  all 3 languages. No undersized visible controls, overflow, raw keys or mock badge in those checks.
- Two fresh automated English journeys passed. These are fast automation runs (17.35s / 16.62s through initial
  share/audit), not timed five-minute spoken rehearsals. Silent browser recordings were captured.
- A separate **full Hindi automated journey passed**, including an actual unpaid reminder and Alpha loan.
  This is a silent browser recording; spoken Hindi narration and microphone capture remain manual.

## Browser acceptance table

| Step | Viewport/language | Result and evidence |
| --- | --- | --- |
| Real worker setup | Desktop, en + hi | OTP request/verify, consent, locked PDF password challenge and retry, transactions and score 85 |
| Money | All three sizes/languages | 4/12-week API fetches, chart, category comparison, real goal creation and validation; [mobile](docs/sanskar-browser-evidence/mobile-money.png) |
| Privacy and sharing | All sizes/languages | Initial share state loaded from backend, on/off persisted across reload, audit visible; [Hindi mobile](docs/sanskar-browser-evidence/hindi-mobile-privacy.png) |
| Lender | All sizes/languages | Four applicant summaries including score 85, no personal/transaction fields, rule change and eligibility delta, logout; [desktop](docs/sanskar-browser-evidence/desktop-lender.png) |
| Lender role guard | Phone, en/hi/mr | A worker login is rejected with translated permission text; proper lender login succeeds |
| Fairness | All sizes/languages | Four personas, Sunita/Arjun comparison, Meena provisional label, 8 test statuses and localized test explanations; [desktop](docs/sanskar-browser-evidence/desktop-fairness.png) |
| Landing | All sizes/languages | Real score 85, no hardcoded persona fallback; both hero CTAs and section anchors navigated |
| Revoke | Desktop, en + hi | 284 transactions deleted, share switches cleared/disabled, lender table shrank from four to three; [Hindi](docs/sanskar-browser-evidence/hindi-revoke.png) |
| After revoke | Desktop, en + hi | Dashboard data-deleted chip; loans display the translated NO_SCORE message; no crash |
| Backend kill test | Desktop, en | Owned backend process stopped for at least 5 seconds; global health banner and landing error visible, no fallback scores; backend restarted successfully; [offline](docs/sanskar-browser-evidence/backend-offline.png) |
| Marathi | Phone/tablet/desktop | App labels and controls checked; [mobile money](docs/sanskar-browser-evidence/marathi-mobile-money.png) |

Expected HTTP 400 responses occurred for the locked-PDF password challenge and NO_SCORE after revoke. Chromium
logs those as failed-resource console entries; the intentional offline test also produces proxy errors. These are
expected negative checks, not zero-error HTTP claims. Populated normal routes returned actual backend JSON.
No application JavaScript exception was observed. A transient ERR_NO_BUFFER_SPACE occurred during the initial
exploratory run and did not recur in the final run.

Full sanitized route results: [acceptance-results.json](docs/sanskar-browser-evidence/acceptance-results.json).
Detailed local automation scripts and raw evidence are under `.venv/browser_*.py` and `.venv/browser-evidence/`.
Session-state files remain ignored and are not committed. Browser runs are headless emulation, not physical phones.

## Fixes made in Sanskar-owned files

- Privacy now hydrates active lender shares from real backend `share_id` values, preserves on/off state on reload,
  blocks repeated pending toggles and clears/disables sharing after revoke. Reset errors no longer silently log out.
- Fairness matches full synthetic names, restores the Sunita/Arjun annotation, and labels Meena provisional without
  inventing 12 weeks of history. Hindi/Marathi explain the checks rather than showing English-only backend detail.
- Landing renders the real fairness API score and personas, removes hardcoded 81/fallback scores, and shows a
  retryable backend-unreachable state on failure.
- Language controls remain available alongside read-aloud; back/navigation labels are translated. Header controls
  wrap at narrow widths. App controls and assigned-site controls have at least 44px targets.
- Goal creation validates inputs, disables while saving, and persists through the real API. Removed the button
  that claimed money had moved with only a toast and no backend operation.
- Lender login validates input and rejects worker roles; permission/category/tip and runtime messages are translated.
- README, PITCH and PRODUCT §6 use verified money, score, stress and deletion numbers. Backend/chart/API ownership
  stayed with Rajat; no new API response contract or feature was introduced.

## Actual Hindi rehearsal

The Hindi run covered: login → consent → locked PDF and password → transactions → score **85** → Alpha KFS →
accept → **26 Friday** instalments of **29,451 paise** → advance clock until one unpaid reminder appears →
create bike-repair goal → fairness → share with Alpha → separate lender login/summary → audit → revoke **284**
transactions → data-deleted chip → NO_SCORE on loans. Lender access disappeared after revocation.

Saved local videos:

- `C:/Users/HP/Desktop/SahayakFin-Hindi-Rehearsal.webm` — silent Hindi browser walkthrough.
- `C:/Users/HP/Desktop/SahayakFin-English-Rehearsal.webm` — silent English automated walkthrough.

A recorder did not capture microphone audio. These files were not uploaded to Drive or a phone.

## Remaining human / release steps

1. **Rajat:** review/merge this branch into integration/final, rerun the release checks and publish main/v1.0.
   No v1.0 release was present when checked during this run. Verify the release again before submitting.
2. **Sanskar:** physically check power/HDMI/sleep/notifications, Chrome display settings and a real phone.
   For phone access on the same LAN, run Vite with `npm run dev -- --host`; don't change firewall settings blindly.
3. Rehearse the spoken five-minute script twice, record microphone narration, and upload the selected backup
   to the intended Drive folder/phone. Automation cannot verify thumb comfort, audio quality or the stage cable.
4. Submit the repo, chosen video and pitch to the actual competition portal; verify visibility/rules and capture
   the submission confirmation. No portal, Drive destination, submission credentials or release confirmation was supplied.
5. Runtime `npm audit --omit=dev` reported two moderate React Router findings; the initial full install reported
   four findings (three moderate, one high). Package/lockfile upgrades were left to Rajat's release work.
6. Rajat's verification report scopes fairness to the supplied synthetic fixtures and records balance-gaming /
   scaling counterexamples. Eight passing demonstration checks do not prove general fairness or production readiness.

Hardware, physical-phone testing, narrated video, cloud upload, main/tag publication and final submission are
explicitly **not complete**. Do not mark this report as a completed competition submission.
