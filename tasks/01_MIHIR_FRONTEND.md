# Mihir: Frontend, UX and the demo experience

## Your role in one paragraph

You build everything the judges see and touch:
- the phone app a first-time digital user would use, in English, Hindi and Marathi;
- the Fairness Lab;
- the lender dashboard.

That is **"User Experience", 20%**, plus most of **"Pitch & Demo", 10%**. You also make the fairness and privacy work *visible*, which is how the other 55% of the marks get noticed. You only talk to the backend through the API in CONTRACTS §5. Until it's ready you use mocks.

**You own:** `frontend/**` (including `package.json`, the lockfile, `src/locales/*` and `src/mocks/*`) and this file.

**Never edit:** `backend/**`, `data/**`.

**Sync:** `bash scripts/sync.sh frontend "ui: <what>"`. It runs `npm run build`, so the build must pass.

**Plain-language glossary:**
- **Mocks:** fake API answers saved as JSON files, so screens work before the backend exists.
- **i18n:** all text lives in translation files (en / hi / mr), not in the code.
- **Route:** a page address like `/score`.
- **Context:** shared app memory (who's logged in, chosen language).

## Your timeline

| Phase | Time | You deliver |
| --- | --- | --- |
| 0 | 22:50–23:05 | Setup |
| 1 | 23:05–00:30 | Scaffold + design system + mocks → Language/Login/Consent/Connect → Processing/Review → Score → Loans + KFS → My loan (schedule) → switch to the real API at 00:15 |
| Review 1 | 00:30–00:50 | You drive the UI in the demo; collect UX issues |
| 2 | 00:50–02:15 | Recategorise, tips, stress slider, insurance, reminders chat + clock + pay, Money tab, Privacy (revoke/audit/shares), Fairness Lab, full Hindi + Marathi |
| 3 | 02:15–02:55 | Lender dashboard, read-aloud, polish; Demo 2 |
| 4 | 03:00–07:00 | Night shift (Claude alone) |
| 5 | 07:00–08:00 | You check the Hindi and Marathi yourself, run the final demo, record the backup video |

## Target folder layout (create exactly this)

```
frontend/
  index.html                 # Google Fonts: Noto Sans + Noto Sans Devanagari; title "SahayakFin"
  .env.development           # VITE_USE_MOCKS=true   (committed; personal overrides go in .env.development.local)
  vite.config.ts             # proxy '/api' -> http://localhost:8000
  tailwind.config.js         # colours from CONTRACTS §8 as tokens: strong, good, fair, building, ink, muted, line, bg
  src/
    main.tsx  App.tsx  i18n.ts
    locales/en.json hi.json mr.json
    api/types.ts client.ts endpoints.ts
    mocks/index.ts + one JSON per endpoint
    state/session.tsx        # token, user, language, consentId, latestScore; persisted in localStorage (try/catch)
    lib/format.ts            # formatINR(paise), formatDate(iso, lang), weekLabel(week_start)
    lib/band.ts              # band → colour + i18n key
    lib/categories.ts        # category → lucide icon + colour + i18n key
    lib/speech.ts            # speak(text, lang)
    components/  PhoneFrame BottomNav TopBar Button Card Chip Toast Sheet ConfirmSheet Skeleton EmptyState
                 ErrorBanner StageList WeekCard TxnRow CategorySheet ScoreGauge ComponentBar ReasonCard TipCard
                 OfferCard KfsCard StressSlider InsuranceCard ScheduleList ReminderChat WeeklyBars GoalCard
                 NudgeCard ConsentCard AuditList ShareToggle ReadAloudButton LanguageSwitch
    screens/     Language Login Consent Connect Processing Review Score Loans MyLoan Money Privacy
                 Fairness LenderLogin LenderDashboard NotFound
```

**Routes:**

| Route | Shown in | Login needed? |
| --- | --- | --- |
| `/` → redirect by `/me` flags, `/language`, `/login`, `/consent`, `/connect`, `/processing`, `/review`, `/score`, `/loans`, `/loan`, `/money`, `/privacy` | phone frame | All except `/language` and `/login` |
| `/fairness`, `/lender/login`, `/lender` | desktop layout | |

**Redirect after login** (from `GET /me`): no active consent → `/consent`; no score → `/connect`; else `/score`.

---

## Phase 0: Setup (22:50 → 23:05)

- [ ] Clone the repo, set git identity, run `bash scripts/setup-dev.sh`.
- [ ] Node 20+ installed. Start `claude` at the repo root.

---

## Phase 1: First Demo build (23:05 → 00:30)

**Paste this prompt:**

```
I am Mihir. I own the React frontend of SahayakFin (docs/CONTRACTS.md §0, §8).
Read CLAUDE.md, ALL of docs/CONTRACTS.md (the JSON shapes in §3.1, §4.1, §5 are exactly what the API returns), docs/PRODUCT.md §1–§3 and §6, and tasks/01_MIHIR_FRONTEND.md (Phase 1, target folder layout, design system, screen specs).
Do Phase 1 items 1.1 → 1.7 in order. Use mocks (VITE_USE_MOCKS=true) until item 1.7, then switch to the real backend.
For each item: build exactly per spec, all visible text through i18n (en complete; hi and mr may be partial in Phase 1 but keys must exist), run `cd frontend && npm run build` (must pass), tick the box in my task file, commit only frontend/ and my task file (no AI attribution, ever). Sync with `bash scripts/sync.sh frontend "<msg>"` after 1.3, 1.5 and 1.7.
Never edit backend/ or data/. If the API differs from the contract, write it in HANDOFF.md under Sanskar and tell me.
```

### 1.1 Scaffold + design system (23:05 → 23:20)

- Create a Vite React-TS app in a temp folder and move it into `frontend/` (keep `.gitkeep` out).
- Install: `tailwindcss` (v3 with postcss is simplest), `react-router-dom`, `i18next`, `react-i18next`, `recharts`, `lucide-react`.
- `vite.config.ts` proxy; `.env.development` with `VITE_USE_MOCKS=true`.

**Design system** (Tailwind tokens + base components):

| Element | Spec |
| --- | --- |
| Background | `#f6f7f9`; cards white, radius 16, soft border `#e5e7eb` |
| Text | ink `#111827`, muted `#6b7280` |
| Primary action | deep teal `#0f766e` (trust, not "bank blue") |
| Band colours | from CONTRACTS §8, always with the band word |
| Type | Noto Sans; body 16; labels 14; screen titles 22 semibold; the big score number 56 bold |
| `Button` | full width, 52 px tall, radius 12; variants primary / secondary / ghost; a loading spinner state |
| `Chip` | small rounded label with a colour variant |
| `Sheet` | bottom sheet with a dim backdrop; closes on the backdrop or Esc |
| `Toast` | top, 2.5 s |

- `PhoneFrame`:
  - On screens ≥ 768 px wide: a centred 390×844 device with radius 40, a dark bezel and inner scroll, and a small caption below: "SahayakFin · demo".
  - On mobile: full screen.
- `BottomNav` (inside the frame, on logged-in phone screens): Home (score) / Money / Loans / Privacy, with lucide icons and i18n labels.
- `TopBar`: back arrow (optional), title, LanguageSwitch (EN · हिं · मरा).

**Acceptance:** `npm run dev` shows the frame with a placeholder route; `npm run build` passes.

### 1.2 API layer, types, mocks, session (23:20 → 23:35)

- `api/types.ts`: TypeScript types for every shape in CONTRACTS §3.1, §4.1 (Offer, KFS, Insurance) and §5 (User, Consent, StatementResult, TxnOut, WeekGroup, Affordability, Stress, Loan, Repayment, Reminder, Wellness, Goal, AuditRow, FairnessReport, Applicant).
- `api/client.ts`:
  - `request<T>(method, path, body?, isForm?)` adds the `Bearer` token and parses JSON.
  - On a non-2xx response, throw `ApiError(code, message, status)` from `{error:{code,message}}`. A 401 clears the session and goes to `/login`.
  - When `import.meta.env.VITE_USE_MOCKS === 'true'`, resolve from `mocks/index.ts` after 300 ms.
- `api/endpoints.ts`: one typed function per endpoint in CONTRACTS §5 (`login`, `getMe`, `createConsent`, `uploadStatement(file, consentId, password?)`, `aaFetch`, `getTransactions`, `patchTxn`, `getLatestScore`, `whatIf`, `getAffordability`, `stress`, `getOffers`, `acceptOffer`, `getLoans`, `payRepayment`, `getReminders`, `advanceClock`, `getWellness`, `createGoal`, `getGoals`, `getAudit`, `getConsents`, `revokeConsent`, `getLenders`, `share`, `unshare`, `getFairness`, `getApplicants`, `putRules`, `demoReset`, `patchMe`).
- `mocks/*.json`: realistic data, written by hand from the contracts.
  - The ScoreResult is golden vector A (81 STRONG); KFS is the §7 example (₹7,500 → ₹307/week, APR 32%).
  - 3 weeks of transactions with masked narrations; 3 offers (ELIGIBLE / NEEDS_REVIEW / OUTSIDE) + 3 insurance.
  - A loan with 26 rows; 3 reminders; wellness for 4 weeks; the fairness report for 4 personas with 7 tests; 3 applicants.
- `state/session.tsx`: React context + `useSession()`.
- `lib/format.ts`:
  - `formatINR(paise)` via `Intl.NumberFormat('en-IN', {style:'currency', currency:'INR', maximumFractionDigits:0})`.
  - `formatDate(iso, lang)` gives "29 Oct", localised via `Intl` with `hi-IN` / `mr-IN`.

### 1.3 Entry screens (23:35 → 23:55)

Exact English copy below; put the hi and mr equivalents in the locale files.

| Screen | Spec |
| --- | --- |
| **Language** `/language` | The logo text "SahayakFin" + tagline "Your work history is your credit history." Three big buttons, each in its own script: "English", "हिंदी", "मराठी". Saves the language → `/login`. |
| **Login** `/login` | Title "Log in with your phone". 10-digit phone input (numeric keypad) → "Send OTP" → a 6-box OTP input, "Verify". Small muted text "Demo OTP: 123456". After verify: `PATCH /me {language}`, then redirect by `/me`. Errors: `OTP_INVALID` → "That code is not right. Try 123456 in the demo." |
| **Consent** `/consent` | Title "Before we look at your bank data". Four rows with icons: 1) FileText "We read: bank transactions from the last 90 days" 2) Target "Why: to check which small loans are safe for you" 3) Clock "We keep it: 30 days, then it's deleted" 4) ShieldCheck "You can stop anytime: one tap in Privacy deletes it". Muted line: "We never ask for your bank password, UPI PIN or OTP." Buttons: Allow (primary) → `POST /consents` → `/connect`; "Not now" (ghost) → Language. |
| **Connect** `/connect` | Title "Share your statement". Card A "Upload bank statement (PDF or CSV)": tap/drag file picker, accept `.pdf,.csv`. On `PDF_PASSWORD_REQUIRED`, a password field slides in under the file name with the hint "Usually your name + date of birth. Demo: RAVI0101" → retry. Card B "Connect bank (Account Aggregator demo)": persona chips Ravi / Sunita / Arjun / Meena → `POST /aa/fetch`. Small link "Download a sample statement" → `/api/v1/demo/samples/ravi.pdf`. Both cards go to `/processing`, carrying the StatementResult in state. |

**Sync.**

### 1.4 Processing + Review (23:55 → 00:05)

**Processing** `/processing` (`StageList`):
- Four rows tick in order, each shown for at least 450 ms even if the API was faster:

| Stage | English line |
| --- | --- |
| READ (FileSearch) | "Reading your statement" |
| MASK (EyeOff) | "Hiding account numbers and names" |
| CATEGORISE (Tags) | "Sorting spending: fuel, food, rent…" |
| SCORE (Gauge) | "Calculating your Financial Trust Score" |

- Each row shows its `ms` in muted text after it ticks ("0.18 s").
- Then: "Done: 214 transactions from 12 weeks" → auto-go to `/review` after 1 s.
- If the upload fails, show the friendly error + a "Try again" button back to `/connect`.

**Review** `/review`, title "Check your transactions":
- Subtitle: "Tap anything that looks wrong. Your score updates instantly."
- `WeekCard` per week (newest first): header "Week of 19 Oct · In ₹5,120 · Out ₹4,260", collapsed except the newest.
- `TxnRow`: category icon in a soft circle, masked narration (one line, ellipsis), date, amount (green "+₹" for CR, ink "−₹" for DR). Flags shown as tiny chips: ROUND_TRIP "Not counted", BOUNCE "Bounced".
- Bottom button "See my score" → `/score`.
- Category correction comes in Phase 2.

### 1.5 Score screen (00:05 → 00:15) `/score`

- `ScoreGauge`:
  - An SVG semicircle 0–100 with faint band zones (0–39 grey, 40–59 amber, 60–79 light green, 80–100 green) and a needle/arc to the score.
  - The big number in the centre with the band word under it, in the band colour.
  - A count-up animation 0 → score over 800 ms.
- Chips row:
  - Confidence: "High confidence · 12 weeks of data".
  - If provisional: amber chip "Provisional: needs more weeks".
  - If `consent_revoked`: grey chip "Data deleted".
- **"What builds your score"**, 4 `ComponentBar`s (label, 0–100 bar in neutral teal, value, one plain line):

| Component | Line | If unavailable |
| --- | --- | --- |
| Income steadiness | "How close your low weeks are to your normal weeks" | |
| Saving habit | "Weeks you saved anything, even ₹20" | |
| Bills on time | "Rent, electricity, recharge, EMIs paid on time" | "No regular bills found: not counted" |
| Living within income | "Weeks you spent less than you earned" | |

- **"Why not higher"**: 2 `ReasonCard`s from `reasons[]` (`reason.<CODE>` with params, e.g. "You saved in 6 of 12 weeks").
- **"How to improve"**: `TipCard`s "Save ₹20 or more every week → about +13 points". Tapping one calls `POST /scores/what-if` → toast "If you do this: 81 → 94".
- A muted footer line: "This is not a CIBIL score. It is built only from your own transactions, never from your name, gender, religion, caste or address."
- Primary button "See safe loans" → `/loans`.

**Sync.**

### 1.6 Loans + KFS + accept + My loan (00:15 → 00:25)

**Loans** `/loans`:
- Input card "How much do you need?": rupee input with quick chips ₹5,000 / ₹10,000 / ₹15,000; default ₹10,000 → `GET /offers?requested_paise=`.
- Banner: "Safe for you: up to ₹7,600" + muted "Based on your low weeks, so repayments stay easy". If `safe_amount < requested`: "You asked for ₹10,000. We suggest ₹7,600 so weekly payments stay safe."
- `OfferCard` per loan, eligible first:
  - lender name + eligibility chip ("Pre-approved" green / "Needs review" amber / "Not available" grey + reason line);
  - the `KfsCard`;
  - button "Choose this loan" (disabled if OUTSIDE).
- `KfsCard`, a clean two-column list:

| Label | Example |
| --- | --- |
| You receive | **₹7,350** |
| Pay every Friday | ₹307 × 26 weeks |
| Total you pay back | **₹7,976** |
| Total cost of this loan | ₹626 |
| Interest shown by lender → true yearly cost (APR) | 24% → **32%**, with an info icon: "APR includes the processing fee, as RBI's Key Fact Statement requires" |
| Late fee | ₹50 · 3-day cooling-off: return it without penalty |
| Fits your weekly budget | ✓ green / ✗ amber |

- Accept → `ConfirmSheet` ("You will pay ₹307 every Friday for 26 weeks. Total ₹7,976.") → `POST /offers/{id}/accept` → `/loan`.

**My loan** `/loan`:
- Summary card (amount, weekly, next due).
- `ScheduleList`: date, amount, status chip (Upcoming grey / Due today amber / Paid green / Overdue red-outline).
- Reminders chat comes in Phase 2.

### 1.7 Switch to the real API (00:15 → 00:30)

- Create `frontend/.env.development.local` with `VITE_USE_MOCKS=false` (not committed).
- Run the backend (Sanskar's README / CLAUDE.md commands) and walk the whole flow with `ravi.csv` and `ravi.locked.pdf`.
- Fix type or shape mismatches on your side. Report contract deviations in `HANDOFF.md` under Sanskar.
- **Sync at 00:25.** Be ready to drive the demo on Sanskar's laptop at 00:30.

**If you are behind at 00:15:** cut the KfsCard's late-fee row and the gauge animation; the flow matters more. Never demo on mocks.

---

## Review 1 (00:30 → 00:50)

You drive. Watch for:
- any English text left on a Hindi screen;
- tap targets that are too small;
- confusing words;
- numbers without ₹;
- layout breaking at 360 px wide.

Write lines in `REVIEW_1.md`.

**Review 1 fixes for me (copy MUST/SHOULD lines here):**
- [ ] …

---

## Phase 2: Complete the app (00:50 → 02:15)

**Paste this prompt** (after `/clear`):

```
I am Mihir. Phase 1 is on main. Re-read CLAUDE.md, docs/CONTRACTS.md §5 and §8, and Phase 2 of tasks/01_MIHIR_FRONTEND.md including my "Review 1 fixes".
Do the Review 1 fixes first, then 2.1 → 2.8 in order against the real API (mocks must also keep working). Build must pass; tick boxes; commit only frontend/; sync after 2.3, 2.6 and 2.8.
```

### 2.1 Recategorise

- Tap a `TxnRow` → `CategorySheet`: a grid of category icons + labels (expense or income set, depending on direction).
- Save → `PATCH /transactions/{id}` → toast "Score updated: 78 → 80"; update the session's latest score; the row shows a small "Edited" chip.

### 2.2 Stress slider + insurance (on `/loans`)

- `StressSlider` under each offer's KFS: "What if your income drops?" with segmented options 10% / 20% / 30%.
  - Calls `POST /affordability/stress {shock, weekly_instalment_paise}`.
  - Shows the light chip (Green "Safe" / Amber "Tight" / Red "Risky") + "You could still pay in 8 of 12 weeks" + the advice line (`advice.<CODE>`, e.g. "Choose a longer tenure to lower the weekly amount").
- Insurance section "Protect your income":
  - 3 `InsuranceCard`s: name, premium "₹10 / week" or "₹20 / year", cover "₹500 per hospital day", a "Govt scheme" badge for PMSBY, and a "Demo product" tag for the others.
  - Button "Add" → toast "Added (demo)". There's no API for buying; it's a demo.

### 2.3 Reminders chat + clock + pay (on `/loan`)

- `ReminderChat`: a WhatsApp-style thread.
  - Header "SahayakFin · Payment reminders" with a green avatar.
  - Grey incoming bubbles, the time on the right, ticks.
  - Text from `reminder.<CODE>` with params. Example REMINDER_T_MINUS_2 (en): "Namaste Ravi 🙏 Your payment of ₹307 to MFI Alpha is due on Friday, 6 Nov. Reply PAY to pay, or HELP to talk to us."
  - Tone: polite, never threatening (RBI conduct rules).
- Small demo button "⏩ Next day (demo)" → `POST /demo/advance-clock {days:1}` → refresh reminders and schedule.
- "Pay ₹307 now" on the next due row → `POST /repayments/{id}/pay` → the row turns Paid + toast.
- **Sync.**

### 2.4 Money tab `/money`

- Title "Your money this week".
- `WeeklyBars`: a Recharts stacked bar for the last 4 weeks by category.
  - Use the category colours from `lib/categories.ts` (max 6 visible categories; the rest grouped as "Other").
  - The legend shows icons + labels.
- Comparison list "This week vs your usual": one row per top category with "+30%" in amber when above average, "−10%" in green when below.
- `GoalCard`:
  - With no goal: "Start an emergency buffer" with the suggested target (2 weeks of essential spending, from the wellness data) → name input + amount → `POST /goals`.
  - With a goal: progress bar, "Save ₹60 every week · 8 weeks left".
- `NudgeCard`s from `nudges[]` (`nudge.<CODE>`), each with an icon and one action button where it makes sense (PAYDAY_SAVE → "Move ₹100 to my goal (demo)").

### 2.5 Privacy tab `/privacy`

- `ConsentCard`:
  - purpose, "Data from 28 Jul to 25 Oct", "Deleted automatically on 28 Nov", status chip;
  - a **red-outline** button "Stop sharing and delete my data" → `ConfirmSheet` ("This deletes all your transactions from SahayakFin. Your past score stays only as a loan record.") → `POST /consents/{id}/revoke` → a success state with a big check "214 transactions deleted" → the score screen shows the "Data deleted" chip.
- **"Lenders who can see your score summary"**: `ShareToggle` per lender (`GET /lenders`, `POST/DELETE /shares`) with the explainer "They see only your score, band and reasons, never your transactions."
- **"Who saw my data"**: `AuditList` (`GET /audit`), rows like "MFI Alpha viewed your score summary · 29 Oct, 01:12" with an icon per action.
- A hidden "Reset demo" at the very bottom (small muted link) → `POST /demo/reset` → clear the session → `/language`.

### 2.6 Fairness Lab `/fairness` (desktop, no phone frame)

- Header: "Fairness Lab: the score measures habits, not wealth".
- Persona cards row (4): name, story line, monthly income (₹), the score in a mini gauge, band, confidence.
- A highlight panel comparing Sunita (₹12k, steady, saves weekly) and Arjun (₹40k, uneven, no savings) side by side with big scores: "Lower income, higher score: because steadiness and habits count, not size of income."
- Tests table from `tests[]`: ✓ / ✗, the test name (`fairness.<CODE>` i18n: "Doubling every rupee doesn't change the score", "Changing names doesn't change the score", "Steady beats rich", "Saving more never lowers the score", "Paying bills on time never lowers the score", "Missing bills aren't treated as bad", "No protected attributes used") + the `detail` sentence.
- A footer list "Never used: name, gender, age, religion, caste, address/pincode, contacts, device, what you spend on."
- **Sync.**

### 2.7 Full Hindi and Marathi

- Every key in `en.json` must exist in `hi.json` and `mr.json`. Add `scripts/check-i18n.mjs` (in `frontend/`) that exits 1 on missing keys, and run it before the build.
- Use simple everyday words. "Financial Trust Score" → hi "भरोसा स्कोर", mr "विश्वास स्कोअर". Keep "₹", numbers and lender names as they are.
- Date and number formatting via `Intl` with `hi-IN` / `mr-IN`.

### 2.8 Empty, loading and error states

- Every screen gets a `Skeleton` while loading and an `EmptyState` (e.g. Money with no data: "Upload a statement to see your weekly spending").
- `ErrorBanner` with a friendly `error.<CODE>` text and a retry, for every code in CONTRACTS §5 and these: `NO_SCORE`, `OFFER_NOT_ACCEPTABLE`, `EXCEEDS_SAFE_INSTALMENT`, `UNKNOWN_PERSONA`, `TOO_MANY_REQUESTS`, `VALIDATION_ERROR`, `INTERNAL_ERROR`.
- **Sync. Post:** "frontend Phase 2 complete".

**If you are behind at 01:45:** cut 2.8 to just the error banners, keep the Fairness Lab (judges love it), and tell the team.

---

## Phase 3: Lender dashboard + read-aloud + polish + Demo 2 (02:15 → 02:55)

**Paste this prompt** (after `/clear`):

```
I am Mihir. Re-read Phase 3 of tasks/01_MIHIR_FRONTEND.md. Do 3.1 → 3.3, build must pass, commit only frontend/, sync.
```

- [ ] **3.1 Lender dashboard** (desktop).
  - `/lender/login`: phone 9999999991/2/3 + OTP → `/lender`.
  - Header "MFI Alpha · Applicants who shared their score".
  - Table: Ref (APP-7F3A), score + band chip, confidence, reasons (short labels), safe weekly ₹, requested ₹, eligibility chip.
  - A banner: "You see summaries only. No transactions, names or phone numbers."
  - Rules panel: min band select, max amount, min weeks → `PUT /lender/rules` → an animated "Eligible applicants: 2 → 3".
- [ ] **3.2 Read-aloud.**
  - `ReadAloudButton` (Volume2 icon) on Score and on each KfsCard → `lib/speech.ts` using `window.speechSynthesis`.
  - Voice: `hi-IN` for hi and mr (fall back to any Hindi voice), `en-IN` for en.
  - It reads, e.g., "Your score is 81, strong. Main reason: you saved in 6 of 12 weeks. Tip: save twenty rupees every week."
  - Hide the button if speechSynthesis is unavailable.
- [ ] **3.3 Polish pass.**
  - Consistent spacing (8 px grid); press states; a fade/slide between routes (CSS only).
  - Focus rings; `aria-label` on icon-only buttons; contrast ≥ 4.5:1; check every phone screen at 360 px wide.
- [ ] **3.4 Demo 2 at 02:45:** run the whole script in **Hindi**. Anything broken goes into item 0 of your night prompt.

---

## Phase 4: NIGHT prompt (start 02:55)

```
You are working unattended overnight on SahayakFin as Mihir's assistant. Nobody will answer until 07:00, so never wait; if blocked after 2 attempts, note it in NIGHT_LOG_MIHIR.md and move on.
Setup: git fetch origin && git checkout -b night/mihir origin/main ; git config user.name "Mihir Pukale" ; git config user.email "<MIHIR_GITHUB_EMAIL>" ; git config core.hooksPath .githooks ; cd frontend && npm install && cd ..
Read CLAUDE.md, docs/CONTRACTS.md §5 and §8, docs/PRODUCT.md and tasks/01_MIHIR_FRONTEND.md. Only edit frontend/ and tasks/01_MIHIR_FRONTEND.md. Never push to main. Never add AI attribution to commits. `npm run build` must pass before every commit; use VITE_USE_MOCKS=true if no backend is running.
Work in this order, committing after each and pushing with `git push -u origin night/mihir`:
0. Fix these Demo-2 issues first: <PASTE YOUR DEMO-2 ISSUES HERE, or "none">.
1. Any unticked Phase 1–3 items.
2. i18n: run scripts/check-i18n.mjs; fill every missing hi/mr key with natural, simple wording; search the code for hard-coded English strings in JSX and move them to locales.
3. Mocks parity: make sure every screen works fully on mocks (offline backup demo) including Fairness Lab and lender dashboard.
4. UX polish: consistent headings, spacing, icon sizes; skeletons everywhere; no layout shift; route transitions; the processing stages feel smooth; the KFS card is the clearest card in the app.
5. Accessibility: aria-labels, focus order, contrast ≥ 4.5:1, min text 14px, buttons ≥ 48px.
6. Screenshots: if Playwright installs quickly as a devDependency, add frontend/scripts/screens.mjs that opens each screen with mocks at 390x844 (and /fairness, /lender at 1440x900) and saves PNGs to frontend/screenshots/ for the pitch deck; otherwise skip and log.
7. NIGHT_LOG_MIHIR.md: done / not done / how to verify.
```

## Phase 5: Morning (07:00 → 08:00)

1. Merge `night/mihir` after `npm run build` passes.
2. **You are the native-speaker check:** read every Hindi and Marathi screen and fix any awkward words directly in the locale files.
3. Set `VITE_USE_MOCKS=false`; run the full demo twice with the backend.
4. Record the backup video (OBS, Xbox Game Bar on Windows, or QuickTime on Mac). Keep a mocks-mode tab open as a second backup.

## Troubleshooting (your area)

| Symptom | Fix |
| --- | --- |
| `/api` calls return HTML or 404 | The Vite proxy isn't set, or the backend isn't on 8000. Check `vite.config.ts` `server.proxy['/api']` |
| Hindi shows boxes | Noto Sans Devanagari isn't loaded; check the `<link>` in index.html and the font-family order |
| File upload 422 | Send `FormData` with fields `file`, `consent_id`, `password`; do **not** set the Content-Type header yourself |
| Tailwind classes not applied | The `content` globs in tailwind.config must include `./index.html` and `./src/**/*.{ts,tsx}` |
| speechSynthesis has no Hindi voice | Fall back to `en-IN`, or hide the button; Chrome usually has "Google हिन्दी" |
