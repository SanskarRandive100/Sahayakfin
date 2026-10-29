# Handoff requests

Append a request under the **owner's** heading. Include the exact function or endpoint, the expected JSON, and why. The owner ticks the request off when it's done.

## For Mihir (frontend)

### From Rajat: persona numbers (Phase 1 + 2, real engine on `data/samples/*`, same for CSV / PDF / locked PDF / AA JSON)

| Persona | Score | Band | Confidence | Safe / week | Loan max 26w @24% | Txns | Reasons → tips |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Ravi | 85 | STRONG | HIGH | ₹295.29 | ₹7,200 | 284 | FEW_SAVINGS_WEEKS {weeks 9, of 12} → SAVE_EVERY_WEEK +6; BILLS_LATE {late 2, of 9} → PAY_BILLS_ON_TIME +6 |
| Sunita | 99 | STRONG | HIGH | ₹187.42 | ₹4,500 | 747 | INCOME_UNEVEN → STEADY_INCOME +1 |
| Arjun | 43 | FAIR | HIGH | ₹0 (no loans) | ₹0 | 185 | NO_SAVINGS_SEEN {weeks 0, of 12} → +25; BILL_BOUNCE {bounces 1, late 2, of 9} → +12 |
| Meena | 94 | STRONG | LOW (provisional, 5 weeks) | ₹422.19 | ₹10,300 | 117 | FEW_SAVINGS_WEEKS, INCOME_UNEVEN, THIN_FILE → ADD_MORE_HISTORY {weeks_needed 7} |

**Demo script numbers (PRODUCT §6), Ravi asks ₹10,000:** "Safe for you: ₹7,200". Offers (eligible first, then cheapest):
- MFI Beta: ELIGIBLE, ₹7,200 × 26 weeks, ₹292.27/week, you receive ₹7,128, advertised 21% → true yearly cost 25.0%.
- MFI Alpha: ELIGIBLE, ₹7,200 × 26 weeks, ₹294.51/week, you receive ₹7,056, advertised 24% → true yearly cost 32.0%, total cost ₹601.22.
- MFI Gamma: OUTSIDE, reason BELOW_MIN_AMOUNT (Gamma's minimum is ₹10,000).
- Schedule falls on Fridays. Revoke deletes **284** transactions (CSV/PDF upload of Ravi).

**Things the UI needs to know:**
- Reason `params`: INCOME_UNEVEN `{p25_paise, median_paise}`; NO_SAVINGS_SEEN / FEW_SAVINGS_WEEKS `{weeks, of}`; BILLS_LATE `{late, of}`; BILL_BOUNCE `{bounces, late, of}`; SPENDING_ABOVE_INCOME `{ratio_pct}`; FEW_SURPLUS_WEEKS `{weeks, of}`; THIN_FILE `{weeks}` (component is `null`).
- Tip `params`: SAVE_EVERY_WEEK `{min_amount_paise: 2000}`; PAY_BILLS_ON_TIME `{}`; KEEP_SURPLUS_WEEKS `{deficit_weeks}`; STEADY_INCOME `{median_paise}`; ADD_MORE_HISTORY `{weeks_needed}` with `points: 0` → please don't render "+0 points" for it.
- Offer `reason` codes need i18n (`error.*` or an offer namespace): `BAND_BELOW_MIN`, `TOO_FEW_WEEKS`, `BELOW_MIN_AMOUNT`.
- What-if: `points` matches the tip card; `score_after` is the true re-score, so it can differ from `score_before + points` by 1 (Ravi: 85 → 92 with "+6"). Copy "about +N points" covers this.
- **Stress slider:** Ravi stays GREEN at −10/−20/−30% because his ₹16.5k closing balance covers the shortfall (`buffer_covers: true`, CONTRACTS §4). At −30% he covers only 3 of 12 weeks, so show `weeks_covered` too. For a RED example use Arjun (`BUILD_BUFFER_FIRST`).
- Ravi nudges on 2026-10-25: PAYDAY_SAVE `{amount_paise: 507875, suggest_paise: 10000}`. CATEGORY_SPIKE only looks at FUEL, FOOD, SHOPPING, TRANSPORT, OTHER.
- Fairness Lab: all 8 tests pass. STEADY_BEATS_RICH detail: "Sunita earns about ₹12,502 a month and scores 99; Arjun earns about ₹40,079 a month and scores 43."

## For Rajat (ingest / scoring / finance / data)

- [ ] (Sanskar) `app.ingest.parse_statement` / `normalize` are still stubs on main, so uploads give 3 fake weeks → no band → no loan offers. 7 API tests auto-skip while `app/ingest/sniff.py` docstring contains "STUB" (remove that word when the real parser lands and they run). The API also needs `data/samples/<persona>.aa.json` for `/aa/fetch`, seed persona data and `/fairness/report`.

## For Sanskar (API / DB / security / seed)

### From Rajat: real ingest / scoring / finance are on `main` (same numbers as the table under Mihir)

- `python data/generate_personas.py --check` prints every sample's score; samples are committed in `data/samples/` (16 files + `ravi.alt.pdf`).
- `parse_statement` raises `IngestError` with `.code` in UNSUPPORTED_FILE, PDF_PASSWORD_REQUIRED, PDF_PASSWORD_WRONG, TOO_MANY_PAGES (> 20 pages), NO_TRANSACTIONS. The PDF is decrypted in memory only. `ParseResult.layout` is DEMO_BANK / ALT_BANK / CSV / AA. Parse time: Ravi PDF ~1.3 s, Sunita PDF (13 pages) ~3.4 s.
- `normalize(raw, owner_name, hmac_key)` accepts `bytes` or `str` for the key. `recategorize` returns a **new** Txn (raises BAD_CATEGORY). Round-trip and reversal legs stay IGNORED even if recategorised (gaming defence).
- Date types: ScoreResult `as_of` and `weekly_breakdown` `week_start` are ISO **strings** (safe for the JSON column); `schedule()` rows have `due_date` as `datetime.date` (for the repayments Date column); the last row absorbs rounding so the rows sum to `kfs.total_repayable_paise`.
- `match_offers` returns `[]` when the score is null / confidence NONE / band BUILDING / safe_weekly 0. It skips products whose `kind` isn't LOAN, and also caps by `lender["max_amount_paise"]` when present (for `PUT /lender/rules`). Amounts are whole ₹100s.
- `what_if` raises `IngestError("BAD_TIP")` for unknown codes. `nudges(txns, today, goal)` reads `goal["target_paise"]`, `goal["weekly_target_paise"]`, `goal["saved_paise"]`.
- `fairness_report` takes ~1.2 s for the 4 AA files: cache the result (it only changes when samples change).
- `stress_test` advice for RED is BUILD_BUFFER_FIRST when safe_weekly < ₹100, else TAKE_SMALLER_AMOUNT.
