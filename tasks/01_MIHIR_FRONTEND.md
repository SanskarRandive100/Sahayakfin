# Mihir: Frontend, UX and the demo experience

## Your role in one paragraph

You build everything the judges see and touch. SahayakFin is now a **responsive website** (see `docs/DESIGN.md`):
- a landing page;
- the worker web app, which still works on a phone for a first-time user, in English, Hindi and Marathi;
- the Fairness Lab;
- the lender portal.

**Phase 1 (00:30 demo) keeps whatever layout exists. The website conversion starts in Phase 2.**

That is **"User Experience", 20%**, plus most of **"Pitch & Demo", 10%**. You also make the fairness and privacy work *visible*, which is how the other 55% of the marks get noticed. You only talk to the backend through the API in CONTRACTS §5. Until it's ready you use mocks.

**You own:** `frontend/**` (including `package.json`, the lockfile, `src/locales/*` and `src/mocks/*`), `docs/DESIGN.md` and this file.

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
| 2 | 00:50–02:15 | **Website conversion with two Claude sessions.** A: foundations (packages, shadcn, tokens, routes), app shell + onboarding wizard, Dashboard, Transactions, Loans with risk graph, My loan, Money, Privacy, i18n. B: charts library C1–C12, landing page, Fairness Lab |
| 3 | 02:15–02:55 | Lender portal, read-aloud, design QA at 375/768/1440 px; Demo 2 in Hindi from the landing page |
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

## Phase 2: Turn it into the website (00:50 → 02:15)

The design spec is **`docs/DESIGN.md`**: routes, colours, fonts, charts C1–C12, motion and libraries. Read it fully once.

### Two Claude Code sessions for speed (same laptop, same repo, separate folders)

| Session | Opens in | Owns (only edits these) | Never touches |
| --- | --- | --- | --- |
| **A "APP"** | Terminal 1 | `frontend/src/app/**`, `src/components/**`, `src/api/**`, `src/state/**`, `src/lib/**`, `src/mocks/**`, `src/locales/{en,hi,mr}.json`, `src/App.tsx`, `src/main.tsx`, `package.json`, the lockfile, Tailwind/shadcn config, `index.html` | `src/site/**`, `src/charts/**` |
| **B "SITE + CHARTS"** | Terminal 2 | `frontend/src/charts/**`, `frontend/src/site/**`, `src/locales/site.{en,hi,mr}.json` | everything else, **including `npm install`** (ask A) |

**Rules for running both:**
- Only **A** installs packages and runs `scripts/sync.sh`.
- B only commits its own folders: `git add frontend/src/charts frontend/src/site frontend/src/locales/site.*.json && git commit -m "..."`. A's next sync pushes them.
- **Charts are "dumb":** B's chart components take typed props and do no API calls, so A's pages just pass data in. Until B delivers a chart, A uses a placeholder card.

### 2.0 Session A first (00:50 → 01:00): foundations, before B starts

**Paste into A** (after `/clear`):

```
I am Mihir, session A "APP". Phase 1 is on main. Read CLAUDE.md, docs/DESIGN.md (all), docs/CONTRACTS.md §5 and §8, and Phase 2 of tasks/01_MIHIR_FRONTEND.md including my "Review 1 fixes".
Do item 2.0 now: install every package in DESIGN §6 (shadcn init with the CLI matching our Tailwind version, then the listed shadcn components), map DESIGN §2 colours to Tailwind tokens and shadcn CSS variables (--primary = brand-700 etc.), load the DESIGN §3 fonts, and register routes: `/` → lazy `src/site/Landing.tsx`, `/fairness` → lazy `src/site/FairnessLab.tsx`, `/dev/charts` → lazy `src/charts/ChartsGallery.tsx` (create these three as simple placeholders), and the `/app/*` routes from DESIGN §1 pointing at the existing screens, with redirects from the old routes. Build must pass. Commit and sync. Then tell me "B can start".
Only edit session-A paths (task file table). Never add AI attribution.
```

**Acceptance:** `npm run build` passes; `/`, `/fairness` and `/dev/charts` show placeholders; old routes redirect; the brand colours are visible on buttons.

### Session B (01:00 → 02:15): charts library + landing + Fairness Lab

**Paste into B** (in a second terminal, `claude`):

```
I am Mihir, session B "SITE + CHARTS". Read CLAUDE.md, docs/DESIGN.md (all — §4 charts, §5 motion, §6 libraries, §7 landing), docs/CONTRACTS.md §3.1, §4, §5, §8 and the Session B items in tasks/01_MIHIR_FRONTEND.md.
Only edit frontend/src/charts/**, frontend/src/site/** and frontend/src/locales/site.*.json. Do NOT run npm install or edit package.json, App.tsx or other folders — if you need a package or a route, tell me and I'll ask session A.
Do B1 → B3 in order. Build must pass (`cd frontend && npm run build`) before each commit; commit only my folders with `git add frontend/src/charts frontend/src/site frontend/src/locales/site.*.json`. Never add AI attribution.
```

- [ ] **B1 Charts library (01:00 → 01:40).**
  - One file per chart in `src/charts/`: `ScoreGauge` (C1), `ContributionBar` (C2), `SteadinessChart` (C3), `RiskGraph` (C4), `SafeZoneMeter` (C5), `KfsCostBar` (C6), `CashFlowChart` (C7), `SavingsStreak` (C8), `RepaymentTimeline` (C9), `IncomeScoreScatter` (C10), `BandDistribution` (C12).
  - Props are the contract types from `src/api/types.ts` (import only; never edit that file).
  - Each chart has its one-sentence caption (prop `caption`, i18n from the parent) and handles empty data.
  - Follow DESIGN §4 exactly:
    - colours from the tokens;
    - Motion per §5 with reduced-motion respected;
    - the RiskGraph segmented control 0/10/20/30% is a **controlled prop** (`shock`, `onShockChange`), so the parent calls the API.
  - `ChartsGallery.tsx` (`/dev/charts`) renders every chart with mock data from `src/mocks` (import only).
  - **Acceptance:** `/dev/charts` shows all 11 charts correctly at 1440 px and 375 px wide. Post "charts ready" to A.
- [ ] **B2 Landing page (01:40 → 02:05).**
  - DESIGN §7, sections 1–9, in `src/site/Landing.tsx` + `src/site/sections/*`.
  - 21st.dev / Magic UI components: Number Ticker, Animated Beam, Border Beam, Bento grid, Marquee. Use each component page's "Copy prompt" (or the Magic MCP if installed). Place them under `src/site/ui/`. If one needs a new npm package, ask A to install it.
  - The hero gauge reuses `ScoreGauge`. Text comes from `site.*` i18n keys (en complete; hi and mr in 2.8 / night).
  - **Acceptance:** Lighthouse-style sanity — no layout shift, readable at 375 px, both CTAs work.
- [ ] **B3 Fairness Lab page (02:05 → 02:15).** `src/site/FairnessLab.tsx` per DESIGN §1 / §4:
  - persona cards;
  - **C10 scatter** with the "Lower income, higher score" annotation;
  - the tests list with ✓/✗ + detail (C11 style);
  - the "Never used" list.
  - Data comes from `GET /api/v1/fairness/report` through `src/api/endpoints.ts` (import only; ask A if the function is missing).

### Session A (01:00 → 02:15): the app on the new shell

**Paste into A** after 2.0 is synced:

```
Session A: continue with items 2.1 → 2.8 of tasks/01_MIHIR_FRONTEND.md, against the real API (mocks must keep working). Use chart components from src/charts/ as they land (pull/check the folder; until then a placeholder card with the chart name). Build must pass; tick boxes; commit only session-A paths; sync after 2.3, 2.6 and 2.8.
```

- [ ] **2.1 App shell + onboarding wizard.**
  - `src/app/AppShell.tsx` per DESIGN §1: sidebar ≥ 1024 px, icon rail 768–1023 px, top bar + bottom nav < 768 px; top bar with the language switch, read-aloud slot and an avatar menu (Reset demo).
  - `/app/start` wizard: the existing Language → Login → Consent → Connect → Processing screens inside one centred card with a 5-step stepper (21st.dev Stepper or shadcn-based).
  - After processing → `/app/dashboard`.
  - The PhoneFrame is removed; mobile is now just the responsive layout.
- [ ] **2.2 Dashboard** `/app/dashboard`: the DESIGN §1 grid.
  - C1 gauge + confidence/provisional/consent-revoked chips.
  - C2 contribution bar + 2 reason cards.
  - C3 steadiness chart (from `score.metrics.weekly` + median/P25).
  - C8 savings streak + tip cards (what-if toast "81 → 94").
  - Risk snapshot card: run `stress` at 20% for the cheapest eligible offer once a loan exists, else "Check loans to see your bad-week test".
  - Footer line: "Not a CIBIL score…".
- [ ] **2.3 Transactions** `/app/transactions`.
  - Week cards with filters (All / Money in / Money out / Edited) and a search box.
  - Recategorise via the CategorySheet → `PATCH` → toast "Score updated 78 → 80".
  - Flags shown as chips ("Not counted", "Bounced").
  - **Sync.**
- [ ] **2.4 Loans** `/app/loans`.
  - Amount input + quick chips → C5 safe-zone meter (`safe_amount_paise`, `rbi_cap_amount_paise`, the requested amount).
  - Right-size banner.
  - Offer cards: eligibility chip + KFS list + **C6 cost bar** + an expandable **"Bad-week test" C4 risk graph**. The shock control calls `POST /affordability/stress {shock, weekly_instalment_paise: kfs.instalment_paise}` and shows the light chip + "You could pay in 8 of 12 weeks" + advice.
  - Accept → confirm sheet → `/app/loan`.
  - Insurance cards ("Protect your income").
- [ ] **2.5 My loan** `/app/loan`.
  - **C9 repayment timeline** + schedule list + the WhatsApp-style reminders chat (spec from the old 2.3: polite tone, `reminder.<CODE>`), "⏩ Next day (demo)", "Pay ₹307 now".
- [ ] **2.6 Money** `/app/money`.
  - **C7 cash-flow chart** (4 / 12 week toggle).
  - "This week vs your usual" list (amber when +30%).
  - Goal card (create, progress).
  - Nudge cards.
  - **Sync.**
- [ ] **2.7 Privacy** `/app/privacy`. Spec unchanged from the earlier version:
  - consent card + red-outline "Stop sharing and delete my data" → confirm → animated "214 transactions deleted";
  - lender share toggles;
  - "Who saw my data" audit list.
- [ ] **2.8 i18n + states.**
  - `scripts/check-i18n.mjs` (in `frontend/`) compares en/hi/mr **and** site.en/hi/mr, exiting 1 on missing keys; run it in the build.
  - Fill hi/mr for the app screens.
  - Skeletons, EmptyStates and friendly `error.<CODE>` banners for every code in CONTRACTS §5.
  - **Sync. Post:** "website Phase 2 complete".

**If you are behind at 01:45:**
- Session B: drop C9, C11 and C12 and keep C1–C7 + C10.
- Session A: drop the filters in 2.3 and the goal card in 2.6.
- Keep the risk graph and the Fairness Lab: they win marks.

---

## Phase 3: Lender portal + read-aloud + design QA + Demo 2 (02:15 → 02:55)

**Paste into A** (after `/clear`):

```
Session A: do Phase 3 items 3.1 → 3.4 of tasks/01_MIHIR_FRONTEND.md. Build must pass; commit only session-A paths; sync at the end.
```

**Paste into B:**

```
Session B: do item 3.5 of tasks/01_MIHIR_FRONTEND.md (landing + Fairness Lab polish and hi/mr site strings). Only my folders; commit; tell me when done.
```

- [ ] **3.1 Lender portal** (A, under `src/app/lender/`).
  - `/lender/login` (phone 9999999991 / 2 / 3 + OTP) → `/lender` with a dark brand-900 sidebar shell.
  - KPI tiles (Applicants, Eligible, Avg score, Avg safe weekly ₹) + **C12 band distribution**.
  - Applicants table (shadcn Table): Ref, score + band chip, confidence, reasons (short labels), safe weekly, requested, eligibility.
  - Banner "You see summaries only: no transactions, names or phone numbers."
  - Rules panel (min band, max amount, min weeks) → `PUT /lender/rules` → animated "Eligible: 2 → 3".
- [ ] **3.2 Read-aloud** (A).
  - `ReadAloudButton` in the top bar on Dashboard and Loans → `lib/speech.ts` (`speechSynthesis`; hi-IN for hi and mr, en-IN for en).
  - It reads the score, band, top reason and tip; on Loans, the selected offer's weekly amount and total.
  - Hidden if unsupported.
- [ ] **3.3 Design QA pass** (A). Check every page at **375, 768 and 1440 px**:
  - no horizontal scroll;
  - tap targets ≥ 44 px; focus rings; `aria-label` on icon buttons;
  - contrast per DESIGN §2;
  - numbers tabular; every chart has its caption;
  - nothing red except risk items.
- [ ] **3.4 Sync**, then **Demo 2 at 02:45** in **Hindi**, starting from the landing page. Note broken things for your night prompt.
- [ ] **3.5** (B) Landing and Fairness Lab polish: hi/mr strings in `site.*.json`; hero animation timing; section spacing per DESIGN §3; Fairness Lab wording checked against Rajat's real `detail` sentences.

---

## Phase 4: NIGHT prompt (start 02:55; use ONE session, A's folder rules relaxed to all of frontend/)

```
You are working unattended overnight on SahayakFin as Mihir's assistant. Nobody will answer until 07:00, so never wait; if blocked after 2 attempts, note it in NIGHT_LOG_MIHIR.md and move on.
Setup: git fetch origin && git checkout -b night/mihir origin/main ; git config user.name "Mihir Pukale" ; git config user.email "<MIHIR_GITHUB_EMAIL>" ; git config core.hooksPath .githooks ; cd frontend && npm install && cd ..
Read CLAUDE.md, docs/DESIGN.md, docs/CONTRACTS.md §5 and §8, docs/PRODUCT.md and tasks/01_MIHIR_FRONTEND.md. Only edit frontend/, docs/DESIGN.md and tasks/01_MIHIR_FRONTEND.md. Never push to main. Never add AI attribution. `npm run build` must pass before every commit; use VITE_USE_MOCKS=true if no backend is running.
Work in this order, committing after each and pushing with `git push -u origin night/mihir`:
0. Fix these Demo-2 issues first: <PASTE YOUR DEMO-2 ISSUES HERE, or "none">.
1. Any unticked Phase 2–3 items (both sessions' lists).
2. DESIGN compliance audit: go through DESIGN.md §1–§8 line by line and fix every deviation (colours, fonts, spacing, radius, chart captions, motion durations, reduced motion, no red except risk).
3. i18n: run scripts/check-i18n.mjs; fill every missing hi/mr key (app + site) with natural, simple wording; move any hard-coded English in JSX into locales.
4. Mocks parity: every page (landing, app, Fairness Lab, lender portal) works fully with VITE_USE_MOCKS=true — this is the offline backup demo.
5. Responsive check at 375 / 768 / 1440 px for every page (use the Playwright MCP if installed to screenshot; otherwise reason from the code); fix overflow, wrapping and tap sizes.
6. Performance: lazy-load the landing, Fairness Lab, lender portal and charts gallery routes; `npm run build` reports no chunk > 500 kB if possible (split recharts/motion into a vendor chunk via vite manualChunks).
7. Screenshots for the pitch: if Playwright installs quickly as a devDependency, add frontend/scripts/screens.mjs that saves PNGs of landing, dashboard, loans (with the risk graph open), money, privacy, Fairness Lab and lender portal at 1440x900 and 390x844 into frontend/screenshots/; otherwise skip and log.
8. NIGHT_LOG_MIHIR.md: done / not done / how to verify.
```

## Phase 5: Morning (07:00 → 08:00)

1. Merge `night/mihir` after `npm run build` passes.
2. **You are the native-speaker check:** read every Hindi and Marathi page (app + landing) and fix awkward words in the locale files.
3. Set `VITE_USE_MOCKS=false`. Run the full demo twice **starting from the landing page** with the backend.
4. Record the backup video (OBS, Xbox Game Bar or QuickTime). Keep a mocks-mode tab open as a second backup.

## Troubleshooting (your area)

| Symptom | Fix |
| --- | --- |
| `/api` calls return HTML or 404 | The Vite proxy isn't set, or the backend isn't on 8000. Check `vite.config.ts` `server.proxy['/api']` |
| Hindi shows boxes | Noto Sans Devanagari isn't loaded; check the `<link>` in index.html and the font stack in DESIGN §3 |
| File upload 422 | Send `FormData` with fields `file`, `consent_id`, `password`; do **not** set the Content-Type header yourself |
| shadcn init complains about Tailwind | Tailwind v3 project → use `npx shadcn@2.3.0 init` / `add`; v4 → `npx shadcn@latest` |
| A 21st.dev component imports `framer-motion` | Ask session A to `npm i framer-motion`, or change the import to `motion/react` (same API) |
| Two sessions edited the same file | Stop session B; session A keeps its version; B re-applies its change inside its own folder |
| Recharts tooltip shows paise | Pass `formatINR` as the tooltip/axis `tickFormatter` |
