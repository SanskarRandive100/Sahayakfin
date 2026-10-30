# SahayakFin pitch (8 slides + 5-minute demo)

Numbers come from the real engine on `data/samples`, verified in `SANSKAR_INTEGRATION_REPORT.md` and Rajat's `RAJAT_VERIFICATION_REPORT.md` on `work/rajat-scoring-verify`. The reports validate separate feature revisions; they are not proof of a merged release. Re-check after generator or engine changes. Browser and rehearsal evidence is recorded separately.

**One line:** "Your CIBIL score is blank, but your UPI history isn't. SahayakFin reads it fairly, explains every
point, and only lends you what you can repay in a bad week."

---

## Slide 1: The problem

- They are paid digitally every week, but have no salary slip, no ITR and often no credit history.
- This synthetic demonstration explores access to small loans when income is irregular; no market-size or informal-rate statistic has been verified for these slides.

**Speaker notes:** "Banks lend on documents gig workers don't have. But every rupee they earn already leaves a
digital trail. The data exists; nobody reads it fairly."

## Slide 2: Ravi's story

- Ravi, delivery rider. About ₹21k a month, paid every Friday by a food-delivery platform.
- Needs **₹10,000** to repair his bike, which is his income.
- No CIBIL history. The bank says no. A moneylender says yes, at a price.

**Speaker notes:** Keep it human and short. "Everything you'll see is Ravi's (synthetic) bank statement, live."

## Slide 3: The solution in one flow

Consent → upload statement (or simulated Account Aggregator) → **Read → Mask → Categorise → Score** →
explainable score, safe loan amount, weekly instalments, simulated reminders. Revocation deletes source transactions and ends sharing; lending records remain.

**Speaker notes:** "One decision per screen, in Hindi, Marathi or English, with rupees instead of percentages."

## Slide 4: The Financial Trust Score: "steady beats rich"

- 4 parts, all ratios or counts of weeks: income stability (30%), savings habit (25%), bill discipline (25%),
  expense health (20%). No gender, caste, religion, age or location; names are tokenised before scoring.
- Confidence is shown separately and never changes the score. Every score comes with 2 reasons and tips worth
  "+N points".
- **Proof (Fairness Lab, all 8 automated tests pass):** Sunita earns about **₹12,502** a month and scores **99**;
  Arjun earns about **₹40,079** a month and scores **43**. Doubling every rupee leaves the score unchanged. Swapping
  the name changes nothing in these four synthetic samples.
- Ravi: **284 transactions; 85, STRONG, HIGH confidence.** Reasons: saved in 9 of 12 weeks; 2 of 9 bills late.
- Meena: **94, provisional, LOW confidence** (five complete weeks). Arjun has **no loan offer** because his safe weekly instalment is **₹0**.

**Speaker notes:** "We reward stability, not wealth. A steady vegetable vendor beats an erratic cab driver
earning three times more, and we test that automatically."

## Slide 5: Bad-week affordability + the true cost

- The safe weekly instalment comes from Ravi's **own bad weeks**: half of his 25th-percentile weekly surplus, and
  never above RBI's 50%-of-income microfinance cap. For Ravi that is **₹295 a week**.
- He asks for ₹10,000; we say **"Safe for you: ₹7,200"** over 26 weeks, due every **Friday** (his payout day).
- KFS card, MFI Alpha: advertised **24%** → **true yearly cost 32%** (including the 2% fee). You receive
  **₹7,056**; weekly instalment **₹294.51** (about ₹295), total repayment **₹7,657.22**, total cost **₹601.22**. The last instalment reconciles rounding.
- MFI Beta: 21% → **25.0% APR**, ₹292.27 a week. MFI Gamma is unavailable: the matched amount is below its minimum.
- Stress shocks **0/10/20/30%** cover **10/9/6/3 of 12 weeks**, respectively. Ravi stays GREEN because his buffer covers the shortfall.
- On the verified **30 October 2026** demo clock, the 26 Friday repayments start **6 November 2026**. A later start or advanced clock changes the dates.

**Speaker notes:** "We'd rather lend ₹7,200 he can repay than ₹10,000 that traps him."

## Slide 6: Privacy by design

- AA-style consent: purpose, date range and data life on one screen. **Revoke deletes the data on screen**
  (Ravi: **284 transactions deleted**).
- Application code retains the file hash rather than the statement file. Framework multipart handling may use temporary disk storage; strict memory-only ingress is not yet verified. The PDF password is not logged.
- Narrations encrypted with AES-256-GCM; account numbers, phones and UPI ids masked; names become HMAC tokens.
- Lenders see a score summary under an `APP-XXXX` reference: no transactions, names or phones. Every lender view
  appears in the user's "Who saw my data" list.
- Engineering privacy controls are mapped in the architecture document. Legal compliance has not been assessed.

**Speaker notes:** Show the audit entry "MFI Alpha viewed your score summary" live.

## Slide 7: Architecture

- React + Vite (phone frame, en/hi/mr) → FastAPI `/api/v1` → pure, unit-tested `ingest` / `scoring` / `finance`
  package → SQLAlchemy database (SQLite for the stage demo; PostgreSQL also supported). Mock AA with FIU / AA / FIP roles.
- 30+ REST endpoints, 14 tables, JWT + roles, insert-only audit log.
- **311 automated tests** passed on SQLite on the final integration baseline; the earlier 243-test suite also passed on PostgreSQL: golden vectors, API flow, security (IDOR, JWT
  tampering, malicious PDFs, consent expiry). Re-run `cd backend && python -m pytest -q` before the pitch and update the count.
- Diagram: the component chart from `docs/ARCHITECTURE.md` §1.

**Speaker notes:** "The scoring engine is pure functions, so every rule is testable and explainable."

## Slide 8: Impact and next steps

- Impact: a credit path for workers with digital income but no documents. Loans sized to bad weeks lower default
  risk for MFIs, and the score improves as habits improve (tips with points).
- Next steps:
  1. Real Account Aggregator integration (Sahamati sandbox) as an FIU.
  2. Pilot with one MFI on repayment outcomes.
  3. Calibrate weights against repayment data, keeping the fairness tests as release gates.
  4. Voice-first onboarding in more languages.

**Speaker notes:** Close with "Your UPI history is your credit history. We just read it fairly."

---

## 5-minute demo script (exact clicks)

**Before:** confirm the configured database is an expendable local demo database before any `python -m app.seed --reset`. Start backend and frontend with mocks disabled, log out of everything,
and keep `data/samples/ravi.locked.pdf` on the desktop. Second browser window: `/fairness`, then `/lender/login`.

| Time | Click | Say / point at |
| --- | --- | --- |
| 0:00 | (title slide) | "Ravi needs ₹10,000 to fix his bike. No salary slip, no CIBIL. Banks say no." |
| 0:20 | **हिन्दी** → phone `9000000001` → **Get OTP** → `123456` → **Verify** | Language first; demo OTP |
| 0:40 | Consent screen → **Allow** | Purpose, 90 days of data, kept 30 days |
| 0:55 | **Upload statement** → `ravi.locked.pdf` → password `RAVI0101` → **Continue** | Stages tick: Read → Mask → Categorise → Score |
| 1:25 | Review: open a week → tap a transaction → change its category → **Save** | Masked rows; "Score updated" |
| 1:50 | Score screen → tap **read-aloud** | **85 STRONG**, HIGH confidence, 2 reasons, tip "+6 points" |
| 2:20 | **Loans** → type `10000` → **Check** | "Safe for you: **₹7,200**"; Beta and Alpha eligible, Gamma "minimum is ₹10,000" |
| 2:40 | Open MFI Alpha's KFS card | "Advertised 24%, **true yearly cost 32%**, you receive **₹7,056**" |
| 2:55 | Stress slider to −20% | Ravi stays green because his savings buffer covers it; point at **6 of 12 weeks covered**. (Switch to Arjun for a red example only if time allows.) |
| 3:10 | **Accept** | 26 weekly instalments, every **Friday**; first **6 Nov** when the demo clock is **30 Oct 2026** |
| 3:20 | **Advance clock** (demo button) | The Hindi reminder appears in the chat |
| 3:40 | Desktop window: `/fairness` | Sunita (₹12.5k/month) **99** vs Arjun (₹40k/month) **43**; scale ×2 same score; name swap same; all tests green |
| 4:10 | `/lender/login` → `9999999991` → `123456` | MFI Alpha sees `APP-XXXX`, score, band, reasons, and **no transactions** |
| 4:25 | Back to Ravi → **Privacy** | "MFI Alpha viewed your score summary" in the audit list |
| 4:40 | **Revoke** → confirm | "**284 transactions deleted**" |
| 4:55 | (closing slide) | "Your UPI history is your credit history. We just read it fairly." |

**Ravi must share with MFI Alpha** before the lender step: Privacy → toggle MFI Alpha on (or do it right after
accepting). Sunita, Arjun and Meena are pre-shared by the seed.

**Backup to prepare:** record the full run with narration; do not claim a backup exists until it is saved and checked. If the PDF step is slow, use **Connect bank (demo)** (AA fetch for Ravi:
same score).

### Verified demo reference

| Metric | Verified result |
| --- | --- |
| Ravi | 284 transactions; 85 STRONG, HIGH confidence |
| Safe loan | ₹7,200 |
| Alpha | ₹7,056 received; ₹294.51/week; ₹7,657.22 total; ₹601.22 cost; 32% APR |
| Beta / Gamma | 25% APR / unavailable below minimum |
| Stress coverage at 0/10/20/30% shock | 10/9/6/3 of 12 weeks |
| Other personas | Sunita 99; Arjun 43 (₹0 safe weekly, no loan); Meena 94 provisional, LOW confidence |
| Revoke / Fairness Lab | 284 source transactions deleted / 8 of 8 supplied-persona tests pass |

Historical scores and lending records remain after revocation; active lender shares end. The eight supplied-persona tests do not establish universal fairness for arbitrary inputs: Rajat's report records unresolved scoring-policy counterexamples.
