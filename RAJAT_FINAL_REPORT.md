# Rajat final integration and worker acceptance

> Historical pre-Sanskar-final snapshot. The final owner fixes and release checks
> supersede its pending items; see `RELEASE_VERIFICATION.md`.

30 October 2026, Asia/Kolkata. Active branch: `integration/final`.
Application revision verified in Chromium: `8ace13ea634e46d778fd788ca593645721a931cd`.
No PR created. Main and release tags have not been changed by this pass.

## Current state

- R1 complete: both specified owner branches merged without conflicts, starting at
  `bba49759f4adaa2a8e3b11d078de6b99977d1ba4`. Rajat source was `aa1c717`;
  Sanskar source was `06f7439`; resulting merged backend revision was `baa4e36`.
- R2 complete: explicit mock badge and one console warning; startup/polled real
  backend health banner; retry/recovery; no API-client fallback to mocked data.
- R3 automated complete: **27/27 worker steps** pass (English desktop and mobile,
  Hindi mobile), with no unexpected console errors or horizontal overflow.
  Additional guard/race/resumed-login/control checks pass.
- R4 complete: `docs/ALGORITHM.md` contains the requested v2.1 known limitations
  and the judge answer. No scoring/finance/ingest code, weights or persona numbers
  were changed in the final-demo pass.
- R3 manual / R5 pending: Rajat reports that Sanskar is currently doing the Hindi
  walkthrough. That is progress, not a passed rehearsal confirmation.
- R6 held: wait for successful human rehearsal confirmation, owner follow-ups and
  final release checks before changing `main` or creating/pushing `v1.0`.

## Executed checks

| Check | Result |
| --- | --- |
| `cd backend; python -m pytest -q --tb=short` after both merges | 311 passed, 0 failed, 0 skipped, 2 warnings; 40.61s |
| `python data/generate_personas.py --check` | exit 0; 17 formats equivalent; 0 mismatches |
| `python data/verify_pipeline.py` | exit 0 |
| `cd frontend; npm ci` | passed; application package/lockfile unchanged |
| `npm run check-i18n` | passed |
| `npm run build` on worker fixes | passed; latest build 6.25s |
| Chromium worker acceptance | 27 steps passed; 0 unexpected console errors; 0 horizontal overflow |
| Explicit mock-mode check | badge on landing/language/login; exactly one warning; zero real API calls |
| Backend-outage check | red banner, visible login error, no fallback, retry restores healthy state |
| Delayed real offer responses | newest amount wins; quick amounts and zero validation pass |
| Resumed-login/control check | existing consent restored; CSV upload 284; PDF sample 200; cancel/back controls pass |
| Attribution-hook check | mixed-case assistant co-author lines removed; human sign-off preserved |

Python 3.13.5, Node 22.23.2, npm 10.9.8, Playwright 1.64.1 / installed Chromium
revision 1248. Browser evidence and a source-file SHA-256 manifest are under
`data/browser_acceptance/`. The two backend warnings concern installed
Starlette/httpx deprecation and the intentional short JWT key in a tampering test.
The combined suite was run on isolated SQLite here. Sanskar's separate source-branch
PostgreSQL evidence is in `SANSKAR_INTEGRATION_REPORT.md`; this report does not claim
a combined-branch PostgreSQL rerun on this machine.

A password-free locked-PDF upload intentionally produces `PDF_PASSWORD_REQUIRED`
(HTTP 400). The corresponding browser resource-error entry is preserved in each
run and classified as expected. There are no other worker console errors.
Guard tests deliberately inject health/login failure and delay actual offer responses;
the worker journeys themselves do not intercept or fabricate API responses.

## Isolated live environment

Existing processes on ports 8000 and 5173 were left untouched. Testing used:

- Uvicorn: `http://127.0.0.1:18000`, from this final worktree's `backend`.
- Vite: `http://127.0.0.1:15173`, with `/api` proxied to that Uvicorn.
- Disposable database: `backend/.venv/browser-demo.db` (ignored).
- Local `frontend/.env.development.local`: `VITE_USE_MOCKS=false` (ignored).
- A separate explicitly mocked Vite on 15174 was used only for badge checks.

No existing database was reset or existing server stopped. The acceptance harness
resets only the disposable API's Ravi/demo clock before each viewport. The original
worktrees and their local `.env`/databases remain preserved. Worker evidence captured
real `/api/v1` calls: 154 for English and 78 for Hindi, excluding setup/reset calls.
The health-banner wording refers to the standard backend port 8000, as requested;
this isolated verification uses a deliberate proxy to 18000 instead.

## Worker fixes

1. Review requested 12 weeks and silently omitted the first partial week: **267 of
   284** uploaded transactions were visible. It now requests the supported 52-week
   review range and shows all 284; the score still uses its contracted 12 complete weeks.
2. Tips promised exact `+6` while the what-if result was 85 to 92. Visual and spoken
   tip copy now indicates approximation; existing Hindi/Marathi approximation words
   are preserved. No locale JSON was edited.
3. Mobile had no route back to transactions and no convenient logout. The dashboard
   now exposes the existing transaction-review and logout actions on both widths.
   Logout clears token and cached score and returns to login.
4. A fresh login with active consent but no score could reach Connect without the
   consent ID, making Upload do nothing. Login now retrieves/restores the active
   consent, and direct Connect without consent goes to the consent screen.
5. Loan input changes made concurrent quote requests without response ordering.
   Debounce and a request version prevent stale results replacing the latest amount;
   zero/out-of-range input displays the existing validation error. The race check
   delays a genuine earlier backend response by 1000 ms and confirms the newer one wins.
6. Choosing another file now clears the previous PDF password. Sample download,
   normal CSV upload, confirmation cancellation, category-sheet Escape/backdrop,
   language switching and read-aloud activation were exercised.

Initial browser findings and harness corrections were not counted as final passes:
mobile transaction navigation first timed out; the 267-row and exact-tip findings
were then fixed. Hindi harness selectors initially needed UTF-8 correction and
adjustment for existing localized approximation text. The published final harness
passes independently in both configured languages and exits nonzero on failures.
Speech controls were activated; audible pronunciation still requires a human check.

## Worker acceptance evidence

Each entry links a screenshot. All listed worker API responses came from the running
backend; expected password-rejection responses are explicitly retained.

| Step | Language | Viewport | Result | Evidence | Console errors | Screenshot |
| --- | --- | --- | --- | --- | --- | --- |
| 1: landing | en | desktop | PASS | real health; no mock badge; navigation works (landing static 81 noted below) | none | [image](data/browser_acceptance/evidence/en/desktop-1-landing.png) |
| 2: login-consent | en | desktop | PASS | OTP and active consent | none | [image](data/browser_acceptance/evidence/en/desktop-2-login-consent.png) |
| 3: locked-pdf | en | desktop | PASS | password prompt; 284 txns; score 85; four stages | expected PDF password HTTP 400 | [image](data/browser_acceptance/evidence/en/desktop-3-locked-pdf.png) |
| 4: review-recategorize | en | desktop | PASS | 284 masked rows; correction toast; score stays 85 | none | [image](data/browser_acceptance/evidence/en/desktop-4-review-recategorize.png) |
| 5: dashboard | en | desktop | PASS | 85 STRONG/HIGH; charts; approximate gain; what-if 92 | none | [image](data/browser_acceptance/evidence/en/desktop-5-dashboard.png) |
| 6: loan-offers | en | desktop | PASS | request 10000; safe 7200; Alpha APR 32%; Beta 25% | none | [image](data/browser_acceptance/evidence/en/desktop-6-loan-offers.png) |
| 7: risk-graph | en | desktop | PASS | coverage 10 / 9 / 6 / 3 out of 12 | none | [image](data/browser_acceptance/evidence/en/desktop-7-risk-graph.png) |
| 8: accept-remind-pay | en | desktop | PASS | 26 Friday rows; first 2026-11-06; reminder; PAID | none | [image](data/browser_acceptance/evidence/en/desktop-8-accept-remind-pay.png) |
| 9: navigation-locales-logout | en | desktop | PASS | EN/HI/MR; review link; logout; session cleared | none | [image](data/browser_acceptance/evidence/en/desktop-9-navigation-locales-logout.png) |
| 1: landing | en | mobile | PASS | real health; no mock badge; navigation works (landing static 81 noted below) | none | [image](data/browser_acceptance/evidence/en/mobile-1-landing.png) |
| 2: login-consent | en | mobile | PASS | OTP and active consent | none | [image](data/browser_acceptance/evidence/en/mobile-2-login-consent.png) |
| 3: locked-pdf | en | mobile | PASS | password prompt; 284 txns; score 85; four stages | expected PDF password HTTP 400 | [image](data/browser_acceptance/evidence/en/mobile-3-locked-pdf.png) |
| 4: review-recategorize | en | mobile | PASS | 284 masked rows; correction toast; score stays 85 | none | [image](data/browser_acceptance/evidence/en/mobile-4-review-recategorize.png) |
| 5: dashboard | en | mobile | PASS | 85 STRONG/HIGH; charts; approximate gain; what-if 92 | none | [image](data/browser_acceptance/evidence/en/mobile-5-dashboard.png) |
| 6: loan-offers | en | mobile | PASS | request 10000; safe 7200; Alpha APR 32%; Beta 25% | none | [image](data/browser_acceptance/evidence/en/mobile-6-loan-offers.png) |
| 7: risk-graph | en | mobile | PASS | coverage 10 / 9 / 6 / 3 out of 12 | none | [image](data/browser_acceptance/evidence/en/mobile-7-risk-graph.png) |
| 8: accept-remind-pay | en | mobile | PASS | 26 Friday rows; first 2026-11-06; reminder; PAID | none | [image](data/browser_acceptance/evidence/en/mobile-8-accept-remind-pay.png) |
| 9: navigation-locales-logout | en | mobile | PASS | EN/HI/MR; review link; logout; session cleared | none | [image](data/browser_acceptance/evidence/en/mobile-9-navigation-locales-logout.png) |
| 1: landing | hi | mobile | PASS | real health; no mock badge; navigation works (landing static 81 noted below) | none | [image](data/browser_acceptance/evidence/hi/mobile-1-landing.png) |
| 2: login-consent | hi | mobile | PASS | OTP and active consent | none | [image](data/browser_acceptance/evidence/hi/mobile-2-login-consent.png) |
| 3: locked-pdf | hi | mobile | PASS | password prompt; 284 txns; score 85; four stages | expected PDF password HTTP 400 | [image](data/browser_acceptance/evidence/hi/mobile-3-locked-pdf.png) |
| 4: review-recategorize | hi | mobile | PASS | 284 masked rows; correction toast; score stays 85 | none | [image](data/browser_acceptance/evidence/hi/mobile-4-review-recategorize.png) |
| 5: dashboard | hi | mobile | PASS | 85 STRONG/HIGH; charts; approximate gain; what-if 92 | none | [image](data/browser_acceptance/evidence/hi/mobile-5-dashboard.png) |
| 6: loan-offers | hi | mobile | PASS | request 10000; safe 7200; Alpha APR 32%; Beta 25% | none | [image](data/browser_acceptance/evidence/hi/mobile-6-loan-offers.png) |
| 7: risk-graph | hi | mobile | PASS | coverage 10 / 9 / 6 / 3 out of 12 | none | [image](data/browser_acceptance/evidence/hi/mobile-7-risk-graph.png) |
| 8: accept-remind-pay | hi | mobile | PASS | 26 Friday rows; first 2026-11-06; reminder; PAID | none | [image](data/browser_acceptance/evidence/hi/mobile-8-accept-remind-pay.png) |
| 9: navigation-locales-logout | hi | mobile | PASS | EN/HI/MR; review link; logout; session cleared | none | [image](data/browser_acceptance/evidence/hi/mobile-9-navigation-locales-logout.png) |

## Owner handoff / remaining findings

**Sanskar-owned site:** `frontend/src/site/Landing.tsx` still renders a hardcoded
81 sample gauge and initially supplies fallback persona values before the API
answers; its error catch retains those fallback values. The worker dashboard was
verified at the real score 85. Resolve this landing/static-data inconsistency in
`site/*` before claiming that every part of the website is backed by live data.
The landing comparison also makes a universal scale-invariance claim; the known
small-income counterexample is now documented in ALGORITHM and needs consistent
wording in Sanskar-owned site/pitch copy. These files were not edited here.

**Sanskar-owned locales:** add these two keys in en/hi/mr. They currently have the
requested English fallback text, so structural `check-i18n` passing does not imply
these new runtime strings have been translated:

- `runtime.mockMode`: `DEMO DATA (mocks)`
- `runtime.backendUnavailable`: `Backend not reachable on :8000 — start uvicorn`

**Sanskar-owned doc numbers:** combined backend count is 311; Ravi remains
284 transactions / score 85 / safe INR 7200. Update shared README/pitch/product
figures in his own change and retain the distinction between individual source-branch
PostgreSQL results and the combined SQLite run.

**Sanskar-owned screens:** lender/privacy/fairness/money workflows and broader
mobile/language review are his assignment. Navigating worker screens and checking
language switches does not certify those other workflows. All eight synthetic
fairness checks pass through the merged backend suite; no new engine-policy fix was
silently applied for the previously documented counterexamples.

## Rehearsal speaking card

At the dashboard: "Ravi scores 85, Strong. Income steadiness compares low earning
weeks with normal weeks; savings counts saving weeks; bills checks regular payment
timing and bounces; spending checks living within income. His four contribution
bars and weekly chart explain the result. Saving every week would give about six
points; the actual displayed simulation moves 85 to 92."

At the fairness screen: "Sunita's steady roughly INR 12k monthly income scores 99,
while Arjun's much larger but uneven roughly INR 40k scores 43. All eight supplied
synthetic checks pass. They do not prove universal or real-world fairness."

Judge answers: no ML yet because repayment labels are absent; transaction-kind
filters catch self transfers/refunds/loan credits/round trips, with the documented
balance-growth gap still pending an agreed fix; weights need validation against
real anonymized repayment outcomes and subsequent constrained calibration.

## Release gate

Rajat's latest update says the human Hindi rehearsal is in progress. Do not record
it as passed, release main, or push v1.0 until its success is confirmed. Confirm the
remaining owner fixes, pull integration/final, rerun the release backend/build checks,
review authors and then follow the handoff's release procedure. No force-push or PR.

All commits created in this final pass use Rajat <rajatraghatwan20@gmail.com> for
author/committer. The report/evidence commit follows the verified application commit
and changes only evidence, instructions and task status.
