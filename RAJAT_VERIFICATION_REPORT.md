# Rajat verification and integration handoff

Date: 30 October 2026 (Asia/Kolkata). Synthetic data only.

**Status: authorized stabilization is implemented; contract decisions and integrator acknowledgement remain pending.**
This is a verification pass on the existing integration implementation. No frontend,
API, service, security, dependency, shared-contract, or deployment files were edited.
The original checkout remains on `integration/full-demo`; the feature has a separate worktree.

## Machine-checkable handoff

```text
Baseline SHA: bba49759f4adaa2a8e3b11d078de6b99977d1ba4
Rajat branch: work/rajat-scoring-verify
Validated implementation SHA: 73d64d917c5c0a30b58aa4cdbde1d36b17c221f4
Final feature head SHA: resolve with git rev-parse HEAD; exact final SHA is recorded in the PR
Target branch: integration/full-demo
Python version: 3.13.5
Sample generator/check: python data/generate_personas.py --check; exit 0
Sample generator stdout: data/verification_generator_output.txt
Sample equivalence: 17 formats across 4 personas; 0 mismatches
Evidence command: python data/verify_pipeline.py; exit 0; repeated JSON is byte-for-byte identical
Pure tests: 250 passed / 0 failed / 0 skipped
All-backend pytest (SQLite): 299 passed / 0 failed / 0 skipped; 2 warnings
Baseline all-backend pytest: 231 passed / 0 failed / 0 skipped
Added regression coverage: 68 collected cases beyond baseline
Ravi CSV/PDF/locked PDF/AA/ALT: score 85, STRONG, HIGH, 284 transactions in every format
Ravi affordability: safe weekly 29529 paise; 26-week maximum at 24% = 720000 paise
Sunita: score 99, STRONG, HIGH, 747 transactions
Arjun: score 43, FAIR, HIGH, 185 transactions; safe weekly 0
Meena: score 94, STRONG, LOW, provisional, 5 complete weeks, 117 transactions
Fairness Lab: 8 passed / 0 failed on the four synthetic personas
Broader fairness/gaming: 2 counterexamples reproduced; pending score-interpretation agreement
Contract changes applied: none; signatures, keys, codes, money units and engine version preserved
Contract proposals: ignored-credit balance growth; fixed savings floor vs scale invariance; KFS rounding prose
Merge: not performed; Sanskar acknowledgement required before integration merge
PostgreSQL / browser / frontend build / deployed demo: not executed in this Rajat-owned pass
```

The implementation SHA contains all executable changes. The subsequent evidence/report
commit changes documentation and captured results only. The PR records the final-head
backend rerun. No result here claims validation on a future merged commit.

## Reproduce

Activate the existing backend environment, then run from the feature repository root:

```powershell
python data/generate_personas.py --check
python data/verify_pipeline.py
cd backend
python -m pytest -q tests/test_ingest_parse.py tests/test_ingest_normalize.py tests/test_ingest_validation.py tests/test_ingest_generator_check.py tests/test_scoring_golden.py tests/test_scoring_edge.py tests/test_scoring_personas.py tests/test_scoring_verification.py tests/test_finance.py tests/test_finance_verification.py tests/test_fairness.py
python -m pytest -q
```

Actual interpreter used: sibling `../sahayakfin/backend/.venv/Scripts/python.exe`
from this feature root. Python dependencies: pytest 9.2.0, numpy 2.5.4, pdfplumber 0.11.10, pikepdf 10.17.0, reportlab 5.1.0, fastapi 0.162.0, starlette 1.10.0, httpx 0.28.1, sqlalchemy 2.1.6.
The test harness creates a temporary SQLite database; the original `.env` and database
were not copied, altered or committed. The two warnings are the installed Starlette
TestClient/httpx deprecation and the intentionally short synthetic JWT key used by the
tampering test. Dependency/security-owner files were left to Sanskar.

## Fixes and verification

- CSV headers require the five contracted columns without duplicates; valid reordered
  columns are supported. Missing/extra cells, malformed money and ambiguous debit+credit
  rows are skipped with line warnings. Invalid headers raise `UNSUPPORTED_FILE`;
  an entirely unusable statement raises `NO_TRANSACTIONS`.
- AA `transactions` must be a list. NaN, infinity, booleans and float-overflow amounts
  no longer reach normalization or produce uncaught numeric exceptions. Bad rows are
  skipped with warnings while valid rows survive.
- NEFT debit payees now receive the same extraction, masking and HMAC treatment as
  credits. This also restores NEFT round-trip detection.
- Intentionally ignored rows remain ignored through repeated recategorization,
  including self transfers. Existing categories, kinds and flags remain compatible.
- A lender maximum of zero now caps offers at zero instead of acting as an absent cap.
  Changed positive caps, band/history rules, huge/zero/negative integer requests,
  product bounds, review confidence and allowed tenures were checked.
- `generate_personas.py --check` now compares full parsed transaction rows, score and
  affordability across formats and exits nonzero on mismatch. A regression injects a
  format mismatch to prove the failure path. Existing generated sample bytes stayed unchanged.
- Real PDFs cover blank pages, corrupted input, a 21-page limit and reordered table
  headers. Existing tests cover encryption, correct/missing/wrong passwords, ALT BANK,
  Latin-1/UTF-8, date formats, duplicate rows, refunds, disbursals, HMAC stability/key
  changes, and masking of every persona.
- Scoring checks cover complete Monday-Sunday weeks, the last-transaction anchor,
  explicit `as_of`, zero/seasonal income, missing balances/bills, savings, cash-heavy
  confidence, huge outflows, no transactions, EMI smoothing without double counting,
  half-up band thresholds, golden vectors, tip params and score determinism on all
  four personas (three runs each). The largest-persona score performance test passes
  its 200 ms bound in this environment.
- Repayment rows equal KFS totals exactly for 13/26/52 weeks at 0/18/21/24%.
  Money outputs are integer paise and dates are Python dates on payout weekdays.
  Stress checks at 0/10/20/30% verify non-improving coverage/shortfall, clipping of
  deficit-week spending effects, zero income, missing/negative/depleted buffers.

The pure API has no uploaded-source identity argument or deduplication contract.
Legitimate duplicate rows inside a statement remain intact. Cross-upload deduplication
belongs to `services/txn_store.py`; the existing whole-backend suite was executed,
but storage policy changes remain Sanskar-owned.

## Verified persona handoff for Mihir and Sanskar

| Persona | Rows | Score / band / confidence | Safe weekly (paise) | Uncapped math maximum, 26w at 24% (paise) |
| --- | --- | --- | --- | --- |
| Ravi | 284 | 85 / STRONG / HIGH | 29529 | 720000 |
| Sunita | 747 | 99 / STRONG / HIGH | 18742 | 450000 |
| Arjun | 185 | 43 / FAIR / HIGH | 0 | 0 |
| Meena | 117 | 94 / STRONG / LOW | 42219 | 1030000 |

Meena's math maximum is **not an eligible offer**: all seeded lenders reject her
five-week history, and LOW-confidence quotes are capped at 300000 paise. Arjun
receives no loan offers because his safe weekly amount is zero.

For Ravi requesting 1000000 paise:

| Lender | Eligibility | Amount | Weekly instalment | Net disbursed | Total repayments | APR |
| --- | --- | --- | --- | --- | --- | --- |
| MFI Beta | ELIGIBLE | 720000 | 29227 | 712800 | 759913 | 25.0% |
| MFI Alpha | ELIGIBLE | 720000 | 29451 | 705600 | 765722 | 32.0% |
| MFI Gamma | OUTSIDE (BELOW_MIN_AMOUNT) | 730000 | 29408 | 719050 | 764605 | 23.9% |

All table amounts above are integer paise. Alpha's 26 Friday repayments begin
2026-11-06 and sum to 765722 paise exactly. Its total cost is 60122 paise.
The full `score_result`, reason/tip codes and exact param types, what-if results,
offers for each persona, sample SHA-256 hashes and stress series are committed in
`data/verification_results.json`. Ravi's SAVE_EVERY_WEEK card is about +6 points:
the displayed score moves 85 to 92, so the UI must avoid promising an exact +6.
The evidence also records the 8 fairness-test details and monthly-income definitions;
median-derived monthly estimates in the generator differ from mean-derived estimates
in the Fairness Lab. Do not substitute one definition for another.

## Contract decisions required before changing scoring

**No proposed change below has been applied.** These interactions already exist in
`fts-2.0`; silently adjusting them would change score interpretation or conflict with
the written golden vector. Review with Sanskar and Mihir before a serial contract edit.
Run `python data/verify_pipeline.py` and inspect `unresolved_contract_observations`.

1. **Ignored credits still count through balance growth (gaming gap).**
   Current: income excludes IGNORED transactions, but the raw closing-balance rule
   credits savings from them. Twelve balanced INR 5000 income/expense weeks score
   62 with zero saved weeks; inserting one INR 1000 ignored loan disbursal in week 6
   produces score 65 and one saved week, with income unchanged.
   Reproduction: `data.verify_pipeline.balance_rows(5000, 5000, 1000)` vs the same
   helper without the last argument; the verifier runs both.
   Proposed: define savings balance growth net of signed IGNORED movements between
   closing balances, while preserving actual balances for statements and stress buffers.
   Clarify refund/round-trip/self-transfer treatment, then version the engine and
   confirm persona/golden/UI effects together. This is the outstanding P0 gaming item.

2. **The fixed savings floor conflicts with universal scale invariance.**
   Current: `max(INR 20, 2% of median weekly income)` means INR 500 weekly income
   with INR 485 expenses never reaches the floor (score 64). Doubling every amount
   and balance creates 12 saved weeks and score 97. All four supplied personas still
   pass SCALE_HALF and SCALE_DOUBLE, so the existing tests do not cover this case.
   Proposed decision: either retain the explicit floor and scope the fairness claim,
   or replace the balance-growth floor with a scale-neutral rule while keeping INR 20
   as savings-tip copy only. The latter changes score policy and requires agreement;
   no threshold or published contract was changed here.

3. **KFS prose and golden total disagree by one paisa.**
   Current: `kfs(750000, 24, 2, 26)` returns instalment 30678 and total 797627,
   following the golden vector and exact-EMI total. The prose says rounded
   instalment times tenure, which is 797628. The last schedule row reconciles
   exactly to 797627. Proposed: designate the golden-vector/exact-total policy
   explicitly in CONTRACTS and describe the adjusted last instalment; alternatively
   change all consumers and the golden vector in an agreed versioned change.
   Runtime rounding and output fields were deliberately preserved.

These are reproducible synthetic counterexamples, not failing assertions hidden by
skips or xfails. Test counts above describe the executed suite; they are not a claim
that all requested fairness invariants are satisfied for arbitrary input.

## Owner actions and limits

- **Sanskar + Mihir:** acknowledge the pure-function handoff and decide the three
  contract issues before merge. This PR does not establish that both teammates used
  the same baseline; it records the immutable baseline for their comparison.
- **Sanskar:** review acceptance against current band, confidence and history after
  rule/data changes. Static inspection of `accept_offer` finds amount/tenure and
  instalment checks, but no fresh full `match_offers` eligibility check. Verify
  LOW-confidence/FAIR/MEDIUM caps and changed band/history at acceptance. The pure
  matcher regression is not proof of the API's stale-offer behavior.
- **Sanskar:** decide repeated-GET offer persistence, overlapping upload dedupe
  policy, consent retention/expiry and zero-limit acceptance semantics. Run the
  PostgreSQL suite and the merged-branch API smoke test. Repair the unsafe historical
  sync script in his own change; it was never run here.
- **Mihir:** use the verified score/count/offer/tip outputs above to reconcile mocks,
  enable the actual API for integration, verify the lender role guard and race
  handling, and complete responsive/locale/browser checks in his own files.
- **Sanskar / product owner:** reconcile pitch/product numbers with the evidence.
  No external AA, bank, SMS, paid service, credential or dependency is needed.
- **Team:** complete the live browser flow, consent revoke, demo recording and any
  optional staging deployment after both owner PRs land. Those broader audit tasks
  remain outside this Rajat feature and are not marked done.

## Branch and ownership review

Commits use `Rajat <rajatraghatwan20@gmail.com>` for author and committer, with
`.githooks` active. Push only `work/rajat-scoring-verify`; open its PR against
`integration/full-demo`. Do not merge it, push main, run the sync script, rebase onto
main, force-push, or overwrite teammate work.

Changed files (owned paths only):

- `RAJAT_VERIFICATION_REPORT.md`
- `backend/app/finance/offers.py`
- `backend/app/ingest/aa_parser.py`
- `backend/app/ingest/amounts.py`
- `backend/app/ingest/csv_parser.py`
- `backend/app/ingest/mask.py`
- `backend/app/ingest/normalize.py`
- `backend/app/ingest/sniff.py`
- `backend/tests/test_finance_verification.py`
- `backend/tests/test_ingest_generator_check.py`
- `backend/tests/test_ingest_validation.py`
- `backend/tests/test_scoring_personas.py`
- `backend/tests/test_scoring_verification.py`
- `data/generate_personas.py`
- `data/samples/README.md`
- `data/verification_generator_output.txt`
- `data/verification_results.json`
- `data/verify_pipeline.py`
- `docs/ALGORITHM.md`
- `tasks/02_RAJAT_SCORING.md`
