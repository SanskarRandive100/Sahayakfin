# SahayakFin: how the Financial Trust Score works

**In one line:** we read 12 weeks of a gig worker's bank statement and score *habits* (steady income, saving, paying bills on time, living within means), never wealth or identity. Every point is explained, and the loan size comes from the worker's own bad weeks.

Engine version `fts-2.0`. Code: `backend/app/scoring/` (score), `backend/app/ingest/` (reading statements), `backend/app/finance/` (loan maths). All of it is pure Python with no database or network access, and 171 unit tests cover it (`cd backend && python -m pytest -q`).

---

## 1. Pipeline

```
statement (PDF / locked PDF / CSV / AA JSON)
  → READ        parse rows in memory (pikepdf decrypts in RAM, pdfplumber reads the table)
  → CATEGORISE  ordered keyword rules on the raw text → one of 20 categories → kind
  → MASK        account numbers, phones, UPI handles, person names → hidden; payee → HMAC token
  → FLAG        round trips, self transfers, refunds, bounces, cash income
  → WEEKS       last 12 complete Monday–Sunday weeks; monthly bills spread evenly
  → SCORE       4 components → weighted score 0–100 → band, confidence, reasons, tips
  → AFFORD      bad-week surplus → safe weekly instalment → loan size → KFS cost card
```

Each transaction gets a **kind**, which decides how it counts:

| Kind | Counts as | Examples |
| --- | --- | --- |
| INCOME | income | platform payouts, UPI from customers, cash deposits |
| EXPENSE | spending | fuel, food, rent, bills, ATM cash, bank charges |
| SAVINGS | a saving action (not spending) | RD / FD / SIP / gold / post office |
| DEBT | existing loan repayment | EMI, NACH / ACH debits |
| IGNORED | nothing | transfers to self, refunds, loan disbursals, both legs of a round trip |

## 2. The window

- Weeks run Monday to Sunday. Only **complete** weeks are scored.
- The window is the **last 12 complete weeks** that end on or before the last transaction date (`as_of`). With fewer weeks, all of them are used.
- `I_w` = income in week *w*, `E_w` = spending, `D_w` = debt repayments.

## 3. The four components (each 0–100)

### 3.1 Income stability (weight 0.30): "Is a bad week still a decent week?"

```
income_stability = 100 × min( P25(I_w) / P50(I_w), 1 )
```

- P50 is a normal week (the median). P25 is a typical bad week: a quarter of weeks are worse.
- It is a **ratio**, so a ₹3,000/week vendor and a ₹30,000/week driver are judged on the same scale.
- If the median week has no income, there is no score (confidence NONE).

### 3.2 Savings habit (weight 0.25): "In how many weeks did money get put aside?"

```
savings_habit = 100 × (weeks with a saving) / W_obs
```

A week counts as saved if there is any transfer into a savings product (RD, FD, SIP, gold, post office), **or** the bank balance grew by at least `max(₹20, 2% of median weekly income)` over the week. Small amounts count, so ₹20 a week is enough.

### 3.3 Bill discipline (weight 0.25): "Are regular bills paid on their usual day?"

```
bill_discipline = max(0, 100 × on_time / total − 25 × bounces)
```

- A **recurring bill** is any payee with at least 2 payments in the window in RENT, BILLS, PHONE or EMI.
- Its usual day is the median day-of-month of its payments. A payment is **on time** within ±5 days of it, counted around the month end (the 30th and the 2nd are 2 days apart).
- Each **bounce** (NACH/ECS/ACH return, `RTN CHG`) costs 25 points.
- If there are no recurring bills, the component is **unavailable**, not zero, and its weight is shared among the others. Not having bills is not a bad sign.

### 3.4 Expense health (weight 0.20): "Does spending stay within income?"

```
R = ΣE_w / ΣI_w
band(R) = 100 if R ≤ 0.90;  linear down to 0 at R = 1.20;  0 above
expense_health = 0.5 × band(R) + 0.5 × 100 × (weeks with E_w ≤ I_w) / W_obs
```

**Monthly bills are spread across the weeks.** Rent is paid once a month, so judged week by week every rent week would look like a deficit. For the surplus-week count (and for affordability), each recurring bill payee's total in the window is divided evenly over all weeks. `R` uses actual totals, so spreading never changes it.

### 3.5 The score

```
FTS   = Σ (weight × value over available components) / Σ (weight over available components)
score = floor(FTS + 0.5)          (round half up)
```

| Band | Score |
| --- | --- |
| STRONG | 80–100 |
| GOOD | 60–79 |
| FAIR | 40–59 |
| BUILDING | below 40 (shown in grey, never red) |

## 4. Worked example (golden vector A, CONTRACTS §7)

12 weeks, in rupees:

```
I = 5000 5200 4800 5100 3000 5000 5300 4900 5100 2500 5000 5200
E = 4000 4100 3900 4200 3500 4000 4300 3800 4100 3200 4000 4100
saved = 6 of 12 weeks; bills 5 of 6 on time; 0 bounces
```

| Step | Working | Result |
| --- | --- | --- |
| Sorted income | 2500 3000 4800 4900 5000 5000 5000 5100 5100 5200 5200 5300 | |
| P50 | middle of 5000 and 5000 | ₹5,000 |
| P25 | position 2.75: 4800 + 0.75 × (4900 − 4800) | ₹4,875 |
| Income stability | 100 × 4875 / 5000 | **97.5** |
| Savings habit | 100 × 6 / 12 | **50.0** |
| Bill discipline | 100 × 5 / 6 − 0 | **83.33** |
| R | 47,200 / 56,100 | 0.8414 → band 100 |
| Surplus weeks | weeks 5 (3000 < 3500) and 10 (2500 < 3200) are deficits | 10 of 12 |
| Expense health | 0.5 × 100 + 0.5 × 100 × 10/12 | **91.67** |
| FTS | 0.30×97.5 + 0.25×50 + 0.25×83.33 + 0.20×91.67 = 29.25 + 12.50 + 20.83 + 18.33 | **80.92 → 81 STRONG** |

Every golden vector (A, B, C, D, the ×2 scale vector, band(R), reasons and tip points) is a unit test in `backend/tests/test_scoring_golden.py`.

## 5. Confidence (shown next to the score; it never changes it)

| Confidence | When |
| --- | --- |
| HIGH | 12 weeks and ≥ 80% of money (by value, excluding ignored rows) has a known category |
| MEDIUM | 8–11 weeks, or 12 weeks with less than 80% categorised |
| LOW | 4–7 weeks: the score is marked **provisional** and a THIN_FILE reason is added |
| NONE | fewer than 4 weeks: no score; the user is shown how to build their profile |

If cash deposits are more than half of income, confidence drops one level (but never to NONE), because cash is harder to verify.

## 6. Reasons and tips: why not higher, and how to improve

- **Reasons:** every component loses `weight × (100 − value)` points. The two biggest losses (if > 0) become the reasons, e.g. `FEW_SAVINGS_WEEKS` "You saved in 6 of 12 weeks" and `BILLS_LATE` "1 of 6 bills was late".
- **Tips:** for each reason we re-run the engine with one habit changed, and show the real point gain:

| Tip | What we simulate | Vector A gain |
| --- | --- | --- |
| SAVE_EVERY_WEEK | every week has a saving (₹20 is enough) | +13 |
| PAY_BILLS_ON_TIME | every bill on time, no bounces | +4 |
| KEEP_SURPLUS_WEEKS | no week spends more than it earns | |
| STEADY_INCOME | low weeks raised to the middle week | |
| ADD_MORE_HISTORY | (thin file) come back with more weeks | |

The "What if?" button runs exactly this simulation on the user's own data.

## 7. How much can they safely borrow?

```
F_w           = I_w − E_w − D_w           (spread bills; savings transfers are not subtracted)
safe_weekly   = max(0, min( 0.5 × P25(F_w),  0.5 × P50(I_w) − mean(D_w) ))
rbi_cap       = 0.5 × P50(I_w) − mean(D_w)          (RBI microfinance: all repayments ≤ 50% of income)
loan_max      = safe_weekly × (1 − (1 + r)^−n) / r,  r = rate/100/52,  floored to ₹100
```

- **The instalment comes from a bad week, not an average week.** We take half of the worker's 25th-percentile weekly surplus. It is always stricter than the RBI cap, and existing EMIs are subtracted first.
- If even a typical bad week has no surplus (P25(F) ≤ 0), we offer **no loan**.
- Vector A: P25(F) = ₹900, so safe_weekly = ₹450.
- Repayments are weekly, on the weekday the worker is usually paid (the most common payout day).

**KFS cost card** (`finance/kfs.py`): reducing-balance weekly instalment; processing fee; amount actually received; total repayable; total cost; and the **true yearly cost (APR)**, found by solving for the weekly rate that equates the amount received with the instalments (bisection, 200 steps), × 52.

- Example from CONTRACTS §7: ₹7,500 at an advertised 24% with a 2% fee over 26 weeks gives ₹306.78 a week. You receive ₹7,350, repay ₹7,976.27 and pay ₹626.27 in total cost, so the **true cost is 32.0% a year, not 24%**. The fee is why.

**Offer rules:** band below the lender's minimum or too few weeks → not available. FAIR band → at most ₹5,000; MEDIUM confidence → at most half of loan_max; LOW → at most ₹3,000. Scores within 5 points of the lender's threshold go to human review. Offers are sorted eligible first, then cheapest true cost.

**Income-drop stress test:** income falls 10/20/30%. Flexible spending (fuel, food, shopping, transport, cash) falls with it; fixed costs (rent, bills, family, health, education, charges) do not. A drop is never allowed to make a week look better than it was (this matters only in weeks where flexible spending already exceeds income). We count the weeks that would still cover the instalment:

- GREEN: ≥ 10 of 12 weeks covered, or today's balance covers the total shortfall.
- AMBER: ≥ 7 of 12 weeks covered → suggest a longer tenure.
- RED: fewer → suggest a smaller amount, or building a buffer first.

## 8. Fairness

### 8.1 Rules built into the design

1. **No protected attributes.** The engine reads only these transaction fields: amount, date, direction, category, kind, flags, balance and an anonymous payee token. It never reads names, gender, age, religion, caste, language, location or even the narration text. (`NO_PROTECTED_INPUTS` checks this automatically by parsing the scoring source code.)
2. **Habits, not wealth.** Every component is a ratio or a count of weeks, so multiplying every rupee by any factor leaves the score unchanged.
3. **Missing is not bad.** No bills means bill discipline is "not available" and its weight is re-spread, not scored 0.
4. **Confidence is separate.** Thin or cash-heavy files get a lower confidence label, not a lower score.
5. **Monotonic.** Doing a good thing (saving one more week, paying one more bill on time) can never lower the score, because all weights are positive.
6. **Explained.** Every score comes with the two biggest reasons and a tip with its real point value.

### 8.2 Automated fairness tests (Fairness Lab screen, all passing on the four personas)

| Test | What it does | Result |
| --- | --- | --- |
| SCALE_HALF | halve every amount and balance, re-score | all 4 scores unchanged (Ravi stays 85) |
| SCALE_DOUBLE | double every amount and balance, re-score | all 4 scores unchanged |
| NAME_SWAP | replace the owner's name (and gender) and every payee name, re-normalise, re-score | all 4 scores unchanged |
| STEADY_BEATS_RICH | Sunita vs Arjun | Sunita earns ~₹12,500/month and scores **99**; Arjun earns ~₹40,000/month and scores **43** |
| MONOTONIC_SAVINGS | add one savings week at a time | never lowered a score (16 weeks checked) |
| MONOTONIC_BILLS | make one late bill on time at a time | never lowered a score |
| MISSING_IS_NOT_BAD | delete all of Sunita's bills | bill discipline "not available"; score 99 → 99 |
| NO_PROTECTED_INPUTS | static check of the scoring code | reads only amount_paise, balance_paise, category, date, direction, flags, id, kind, payee_token |

### 8.3 The personas (synthetic, `data/generate_personas.py`, seed 42)

| Persona | Work | Monthly income | Score | Band | Confidence | Safe / week |
| --- | --- | --- | --- | --- | --- | --- |
| Sunita | vegetable vendor, daily UPI + cash | ~₹12,500 | 99 | STRONG | HIGH | ₹187 |
| Ravi | delivery rider, Friday payouts + tips | ~₹23,000 | 85 | STRONG | HIGH | ₹295 |
| Arjun | cab driver, very uneven payouts, existing EMI, 1 bounce | ~₹40,000 | 43 | FAIR | HIGH | ₹0 |
| Meena | tailor, only 5 weeks of history | ~₹15,000 | 94 | STRONG | LOW (provisional) | ₹422 |

The same numbers come out of the CSV, the PDF, the password-locked PDF, the AA JSON and a second bank layout (tested).

## 9. Gaming defences

| Trick | Defence |
| --- | --- |
| Send money to a friend and get it back to fake income | **Round trip:** a debit to payee X and a credit from X within 7 days, amounts within ±10%: both ignored (Arjun's ₹5,000 to a friend is caught) |
| Move money between own accounts to inflate income | **Self transfer:** owner's first + last name, `SELF` or `OWN A/C` → ignored |
| Refunds or a new loan counted as income | `REV`, `REFUND`, `REVERSAL`, `LOAN DISB` → ignored |
| Hide a bounced EMI | NACH/ECS/ACH return charges are flagged BOUNCE: −25 each |
| Unverifiable cash | cash deposits are flagged; > 50% cash lowers confidence |
| Recategorise to look better | user corrections are marked `user_corrected`; round-trip and reversal legs stay ignored whatever the category; corrections are audited |
| Change names to look like someone else | names never reach the engine (NAME_SWAP test) |

## 10. Privacy inside the engine

- The raw file is parsed in memory, and a locked PDF is decrypted in memory. Nothing touches disk.
- Masking happens before storage. Account numbers become `XXXX1234` and phones `XXXXXX3210`; UPI handles become `su****@okaxis`. Person names become `P-3F2A9C1E`, an HMAC-SHA256 token keyed by a server secret: the same person always gets the same token (so recurring bills can be detected), but the token can't be turned back into the name. Business names (platforms, billers, shops) stay readable so users recognise their rows.
- A test checks every masked row of every persona for 9+ digit runs, unmasked handles and any person name.

## 11. Why rule-based, not machine learning?

- **No labelled data.** There is no repayment history for these workers. That's the whole problem. A model trained on bureau data would learn the bias we are trying to remove.
- **Explainability is a requirement.** RBI's Fair Practices Code asks lenders to tell applicants the main reasons a loan was rejected, and a first-time borrower needs to understand what to change. Every point here traces to a formula.
- **Testable fairness.** Invariants like "scaling doesn't matter" and "saving more never hurts" can be *proved* by tests for a rule-based score. For a black-box model they can only be sampled.
- **Next step:** once lenders share repayment outcomes, use them to *calibrate the weights* (e.g. logistic regression on the four component values, constrained to positive weights), keeping the same transparent structure.

## 12. Limitations and how we would validate

- **Weights are expert-set** (0.30/0.25/0.25/0.20), not learned. Validation: track 6–12 months of repayments by band, check default rates fall monotonically from BUILDING to STRONG, and refit the weights with monotonic constraints.
- **12 weeks is short.** It misses seasonality (festivals, monsoon). With AA consent we would read 12 months and compare like-for-like seasons.
- **Keyword categorisation** misses unusual narrations. Users can correct categories, uncategorised money lowers confidence (not the score), and corrections can become new rules.
- **Balance-growth saving** credits money that simply wasn't spent. That's intentional (many workers save by not spending), but a large one-off credit can look like saving. Round trips and self transfers are excluded.
- **Synthetic personas only.** Before any real use we would run the same fairness tests on real anonymised statements, and check outcomes across groups we deliberately do not use as inputs.

## 13. Judge Q&A

**1. Why should a lender trust a score built from 12 weeks of UPI data?**
It measures exactly what predicts repayment of a small weekly loan: whether the bad weeks still leave a surplus, whether bills get paid on their day, and whether money gets put aside. The loan itself is sized from the worker's 25th-percentile week, so even the trust we extend is conservative.

**2. How do you know the score isn't biased against women, minorities or particular regions?**
The engine physically cannot see those attributes: it reads amounts, dates and categories only, and an automated static check proves that. The NAME_SWAP test replaces every name (including switching the owner's gender) and the score doesn't move by a single point.

**3. Doesn't a richer person always score higher?**
No. Every component is a ratio or a count of weeks. Doubling every rupee leaves the score unchanged (tested), and Sunita at ~₹12,500/month scores 99 while Arjun at ~₹40,000/month scores 43.

**4. What stops someone from gaming it by moving money around?**
Round trips (send and receive back within 7 days, ±10%), self transfers, refunds and loan disbursals are all ignored. Bounces are penalised, and heavy cash income lowers confidence. Arjun's ₹5,000 round trip with a friend is caught in the demo data.

**5. Why these weights?**
Stability matters most (0.30), because a weekly instalment fails in a bad week. Savings and bills (0.25 each) are direct evidence of discipline, and expense health (0.20) partly overlaps with the others. They are transparent starting points, to be calibrated on repayment data with positive-only constraints (§12).

**6. What happens to someone with no bills, or only a few weeks of data?**
No bills means that component is "not available" and its weight is shared, never zero. Four to seven weeks gives a provisional score with LOW confidence, and fewer than four gives no score but a clear "build your profile" path.

**7. How is the loan amount decided?**
Half of the worker's typical bad-week surplus (P25), minus existing EMIs, capped below RBI's 50%-of-income microfinance limit. That instalment is turned into a principal at the product's rate. Ravi asks for ₹10,000 and we offer ₹7,200, which he can repay in a bad week.

**8. Why show APR when the lender advertises 24%?**
Because the processing fee is deducted up front, the worker receives less but repays the full amount. The true yearly cost is 32%, and showing it is what RBI's KFS rules intend.

**9. Is the score stable? Will it jump if I upload the same statement twice?**
It's deterministic: the same input always gives the same output (tested 3×). The CSV, PDF, locked PDF, AA JSON and a second bank's PDF layout all give identical scores.

**10. Why not use machine learning?**
There are no repayment labels for this population yet, and a model trained on bureau data would import the exclusion we're fixing. Rules let us prove fairness properties with tests and explain every point. ML is the calibration step once outcomes exist.

**11. What does the lender actually see?**
Only the score, band, confidence, reason codes and the safe weekly amount, and only if the worker turns sharing on for that lender. They never see transactions, names or phone numbers. Every view is written to an audit log the worker can read.

**12. What are the biggest weaknesses?**
The weights are not yet validated on real defaults, 12 weeks can miss seasonal swings, and keyword categorisation is imperfect. Each has a mitigation: positive-constrained calibration, longer AA windows, and user corrections plus confidence labels.
