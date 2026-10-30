# v1.0 release verification — 30 October 2026

Verified combined application: `6208575c272a5efc761055d341b94126adeacdf3`. Final release preparation adds only
this report, updated handoff status and browser evidence/selectors; application source
is unchanged from that verified commit.

- Merged Rajat's verification and worker fixes, Sanskar's backend hardening and
  `work/sanskar-final-browser` (`9ee9a84`) without conflicts.
- Release backend run: **311 passed, 0 failed, 0 skipped**, 2 existing warnings,
  39.32 seconds on isolated SQLite.
- `npm run check-i18n`: passed. `npm run build`: passed, 6.07 seconds.
- Combined release mobile worker pass: **9/9 steps**, no unexpected console errors,
  no horizontal overflow; live landing score **85**, 284 reviewed transactions,
  safe INR 7200, stress coverage 10/9/6/3, 26 Friday instalments, reminder and payment,
  language switches and logout/session clearing.
- The last navigation step was rerun after updating the test selector for Sanskar's
  new accessible language labels. No application fix was needed for that selector.
- Earlier detailed evidence remains in `RAJAT_FINAL_REPORT.md` (27 worker steps)
  and `SANSKAR_FINAL_REPORT.md` (his broader multilingual matrix and Hindi run).
- Landing no longer hardcodes score 81 or keeps fallback scores on errors. Sanskar's
  locale, privacy, lender, money, mobile and documentation fixes are included.
- All repository authors are team members: Mihir Pukale, Rajat and Sanskar Randive.
  New integration/release commits use Rajat <rajatraghatwan20@gmail.com> with no
  assistant co-author attribution.

Evidence: `data/browser_acceptance/release-check/`. Source hashes and actual check
counts are in `source-manifest.json`; screenshots and actual API metadata accompany
`final-results.json`. Historical pre-merge worker evidence is preserved separately.

Rajat instructed us to continue release work while the Hindi walkthrough is handled
on his friend's laptop. This report does not claim a completed physical or narrated
human rehearsal. Hardware, microphone/video backup and competition submission remain
with the people handling that laptop. No cloud deployment or PR is part of this release.

## Known limits

The previously documented ignored-credit savings and fixed-floor scaling edge cases
remain scoped limitations; no engine-policy changes were made during release.
The combined suite was not rerun on PostgreSQL here; Sanskar's earlier source-branch
PostgreSQL evidence remains distinct.

A fresh `npm audit --omit=dev --json` reports **two moderate runtime findings**, both
in React Router, and **zero high/critical runtime findings**. npm's offered fix is a
major migration to react-router-dom 7.18.5. That migration was not introduced during
the time-limited release; the existing dependency findings remain for the next
hardening pass. Demo data and integrations remain synthetic.

## Publication

The release procedure fast-forwards main to the checked integration/final commit,
creates v1.0 without overwriting any existing tag, and pushes main/tag atomically.
Remote ref verification after that push is the publication confirmation; this
report records checks, not an unexecuted claim that publication already succeeded.
