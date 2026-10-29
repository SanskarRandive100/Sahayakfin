# SahayakFin: website design system (owner Mihir; everyone reads §1–§3)

SahayakFin is now a **responsive website**, not a phone-frame app:

- a public **landing page**;
- a **web app** for workers (sidebar on desktop, bottom nav on mobile);
- a public **Fairness Lab**;
- a **lender portal**.

On a projector it looks like a real fintech product. On a phone it still works for a first-time user.

**Rule for tonight:** the 00:30 demo runs on whatever layout exists. The website conversion starts in **Phase 2** (00:50). Never break the working flow to restyle it.

---

## 1. Site map and layouts

| Route | Page | Layout | Priority |
| --- | --- | --- | --- |
| `/` | **Landing**: hero, problem, how it works, the 4 score pillars, fairness proof, privacy promise, for lenders, CTA | Marketing (full-width sections, top nav) | P0 |
| `/app/start` | **Onboarding wizard**: Language → Login → Consent → Connect → Processing (one card, a 5-step stepper on top) | Centered card (max 560 px) | P0 |
| `/app/dashboard` | **Score hub**: gauge, contribution bar, income-stability chart, savings streak, reasons, tips, risk snapshot | App shell | P0 |
| `/app/transactions` | Review + recategorise (week cards, filters) | App shell | P0 |
| `/app/loans` | Ask amount → safe-zone meter → offer cards + KFS + **risk graph** → insurance | App shell | P0 |
| `/app/loan` | Repayment timeline + reminders chat + pay | App shell | P0 |
| `/app/money` | Cash-flow chart, this week vs usual, goal, nudges | App shell | P0 |
| `/app/privacy` | Consent card + revoke, lender sharing, "who saw my data" | App shell | P0 |
| `/fairness` | **Fairness Lab** (public): persona cards, income-vs-score scatter, tests | Marketing | P0 |
| `/lender/login`, `/lender` | **Lender portal**: KPI tiles, band distribution, applicants table, rules panel | Portal shell (dark sidebar) | P1 |

**Old routes:** `/score`, `/loans` and the rest redirect to the `/app/...` equivalents, so nothing breaks.

**App shell:**

- **≥ 1024 px:** a fixed left **sidebar** (240 px, `brand-900` background, white icons + labels: Dashboard, Transactions, Loans, Money, Privacy), plus a top bar (page title, language switch EN · हिं · मरा, read-aloud, avatar menu with "Reset demo"). Content max-width 1200 px, in a 12-column grid with a 24 px gap.
- **768–1023 px:** the sidebar collapses to icons only (72 px).
- **< 768 px:** no sidebar. A sticky top bar plus a **bottom nav** (Dashboard, Loans, Money, Privacy), cards stacked one per row. This is the first-time-user view, so keep it big and simple.

**Dashboard grid (desktop):**
- Row 1: Score gauge card (5 columns) + Contribution bar & reasons (7 columns).
- Row 2: Income-stability chart (8) + Savings streak & tips (4).
- Row 3: Risk snapshot (6) + Next payment / CTA (6).

## 2. Colours (Tailwind tokens; keep these exact hex values)

**Brand and neutrals:**

| Token | Hex | Use |
| --- | --- | --- |
| `brand-900` | `#0B2A3C` | Sidebar, landing hero background, footer |
| `brand-700` | `#0F766E` | **Primary**: buttons, links, active nav, chart accent |
| `brand-800` | `#115E59` | Primary hover / pressed |
| `brand-100` | `#CCFBF1` | Selected states, soft highlights |
| `brand-50` | `#F0FDFA` | Tinted section backgrounds |
| `marigold-400` | `#F5B700` | **Decoration only** (landing underline, hero sparkle, illustrations). Never on data or status |
| `ink` | `#0F172A` | Main text |
| `ink-2` | `#334155` | Secondary headings |
| `muted` | `#64748B` | Helper text, axis labels |
| `line` | `#E2E8F0` | Borders, gridlines |
| `bg` | `#F8FAFC` | App background |
| `surface` | `#FFFFFF` | Cards |

**Meaning colours:** always paired with a word or icon, never colour alone.

| Token | Hex | Use |
| --- | --- | --- |
| `band-strong` | `#1A7F37` | STRONG; "Fits your budget ✓"; stress GREEN |
| `band-good` | `#2DA44E` | GOOD |
| `band-fair` | `#BF8700` | FAIR; stress AMBER; "Needs review" |
| `band-building` | `#6E7781` | BUILDING (grey, never red); OUTSIDE |
| `risk` | `#CF222E` | **Only** the risk graph's short weeks, stress RED, overdue, the destructive "Delete my data" outline |
| `info` | `#2563EB` | Info tooltips, links in legal text |

**Spending category colours** (charts and icons):

| Category | Hex |
| --- | --- |
| FUEL | `#E76F51` |
| FOOD | `#F4A261` |
| RENT | `#2A9D8F` |
| BILLS | `#264653` |
| PHONE | `#8AB17D` |
| TRANSPORT | `#E9C46A` |
| FAMILY | `#9C6ADE` |
| HEALTH | `#EF476F` |
| EDUCATION | `#118AB2` |
| CASH_WITHDRAWAL | `#6C757D` |
| FEES_CHARGES | `#B5838D` |
| everything else | `#94A3B8` (grouped as "Other") |

Show at most 6 categories in a chart; group the rest.

**Contrast:** body text on `bg`/`surface` must be ≥ 4.5:1. White text on `brand-700` passes (5.4:1). Don't put white text on `band-fair`; use `ink` on a `band-fair`/15% tint instead.

## 3. Type, spacing, shape, icons

- **Fonts** (Google Fonts):
  - **Plus Jakarta Sans** (400/500/600/700) for Latin text.
  - **Noto Sans Devanagari** (400/600) for Hindi and Marathi.
  - CSS stack: `"Plus Jakarta Sans", "Noto Sans Devanagari", system-ui, sans-serif`.
  - All numbers use `font-variant-numeric: tabular-nums` so they don't jump while animating.
- **Type scale:**

| Element | Size |
| --- | --- |
| Display (landing hero) | 56/64, 700 |
| H1 | 32/40, 700 |
| H2 | 24/32, 600 |
| H3 | 18/28, 600 |
| Body | 16/24 |
| Small | 14/20 |
| Tiny (axis) | 12/16 |
| Score number | 64, 700 |
| On mobile | body stays 16, H1 → 26 |

- **Spacing:** 8 px grid (4 only for icon gaps). Card padding 24 (mobile 16). Section padding on the landing: 96 px vertical.
- **Shape:** card radius 16, buttons 12, chips full-round. Shadow `0 1px 2px rgba(15,23,42,.06), 0 4px 16px rgba(15,23,42,.06)`. Borders 1 px `line`.
- **Icons:** lucide-react only, stroke 1.75, 20 px in UI and 24 px in nav. The category icon map is in `src/lib/categories.ts`.
- **Tone of words:** plain, warm, respectful. Use "you", short sentences, rupees always. No jargon without a tooltip (APR, KFS, P25).

## 4. Charts catalogue

All charts use **Recharts** via the shadcn `chart` component.

| # | Chart | Page | Question it answers | Data (contract) | Design | Priority |
| --- | --- | --- | --- | --- | --- | --- |
| C1 | **Score gauge** | Dashboard | "How am I doing?" | `score`, `band`, `confidence` | Custom SVG semicircle, faint band zones (0–39, 40–59, 60–79, 80–100), animated arc + number count-up (Motion, 900 ms); band word below in band colour; confidence chip | P0 |
| C2 | **Score contribution bar** | Dashboard | "What makes up my score?" | `components[k].value × weight` normalised by the available weights | One horizontal 100-point stacked bar: 4 segments in brand-700 tints (100/75/50/30%) + a grey "points you can still earn" segment; labels under each segment ("Steadiness 29/30"); tooltip explains each; unavailable component → dashed outline "Not counted" | P0 |
| C3 | **Income steadiness chart** | Dashboard | "Why is my steadiness score what it is?" | `metrics.weekly[].income_paise`, `metrics.median_weekly_income_paise`, `metrics.p25_weekly_income_paise` | 12 weekly bars (brand-700 at 70%); a dashed `ink-2` line "Normal week ₹4,950" (median) and a dashed `band-fair` line "Bad week ₹4,700" (P25); caption "Your bad weeks are 95% of a normal week → steadiness 95" | P0 |
| C4 | **Risk graph (bad-week test)** | Loans (each offer, expandable) and a Dashboard snapshot | "Can I still pay if income drops?" | `/affordability/stress` → `series[]`, `weeks_covered`, `light`; instalment from the KFS | 12 weekly bars of **money left after costs** at the chosen shock; a horizontal dashed line = weekly instalment "Your payment ₹307"; bars **below** the line in `risk` with a label "short ₹120", bars above in `band-strong`; segmented control 0% / −10% / −20% / −30% animates bar heights (Motion/Recharts animation 400 ms); headline chip "Safe / Tight / Risky · You could pay in 8 of 12 weeks"; advice line under it | P0 |
| C5 | **Safe-zone meter** | Loans | "How much is safe to borrow?" | `/offers` → `safe_amount_paise`, `rbi_cap_amount_paise`, `requested_paise` | Horizontal track ₹0 → max: green zone to the safe amount, amber zone to the RBI-cap amount, red beyond; a marker pin at the requested amount with a label; legend "Safe for you · Stretch · Too risky" | P0 |
| C6 | **KFS cost bar** | Loans (inside the KFS card) | "Where does my money go?" | `kfs.net_disbursed`, `fee`, `total_cost − fee` | One stacked bar = total you pay back: "You receive ₹7,350" (brand-700) + "Fee ₹150" (band-fair) + "Interest ₹476" (muted); APR line under: "Shown 24% → true 32%" | P0 |
| C7 | **Cash-flow chart** | Money | "Where did my money go each week?" | `/wellness/weekly` | ComposedChart: stacked bars by category (category colours) + an income line (ink) with dots; 4 weeks (toggle 4/12); legend with icons | P0 |
| C8 | **Savings streak** | Dashboard | "Am I saving regularly?" | `metrics.weekly[].saved` | 12 circles in a row (filled brand-700 = saved, outline = not), week labels below, caption "Saved in 6 of 12 weeks"; pulse on the latest week | P1 |
| C9 | **Repayment timeline** | My loan | "Where am I in my loan?" | `/loans` schedule | Horizontal stepper of n dots (paid = filled green, due = amber ring, overdue = risk ring, upcoming = grey); progress text "4 of 26 paid · ₹6,447 left" | P1 |
| C10 | **Income vs score scatter** | Fairness Lab | "Does more money mean a higher score?" | `/fairness/report` personas | x = monthly income ₹, y = score 0–100, 4 labelled dots; Sunita and Arjun highlighted with a connector and the annotation "Lower income, higher score"; no trend line | P0 |
| C11 | **Fairness test bars** | Fairness Lab | "Do the tests pass?" | `tests[]` | A list with ✓/✗ + small before/after bars for SCALE and NAME tests (equal heights = pass) | P1 |
| C12 | **Lender band distribution** | Lender portal | "What does my applicant pool look like?" | `/lender/applicants` | Bar chart by band (band colours) + KPI tiles: Applicants, Eligible (before → after rules), Avg score, Avg safe weekly ₹ | P1 |

**Chart rules:**
- Axis labels 12 px `muted`; gridlines `line`; no 3-D, no pie charts.
- Every chart has a one-sentence caption that states the takeaway in plain words.
- Tooltips show ₹ via `formatINR`. Empty data → an EmptyState, not a blank chart.
- Respect `prefers-reduced-motion`: no animation.

## 5. Motion

Library: `motion` (formerly Framer Motion), `import { motion } from "motion/react"`.

| What | Animation | Duration |
| --- | --- | --- |
| Page enter | fade + 12 px rise | 250 ms |
| Cards in a grid | stagger 60 ms | 250 ms each |
| Score gauge | arc sweep + number count-up | 900 ms ease-out |
| Processing stages | each tick: check icon scale-in + row colour change | ≥ 450 ms per stage (CONTRACTS demo rule) |
| Risk graph shock change | bar heights morph; short-week labels fade | 400 ms |
| Revoke success | big check draws, then "214 transactions deleted" counts up | 800 ms |
| Toasts / sheets | Sonner slide / vaul drawer defaults | — |
| Landing | hero gauge loops 0 → 81 once; AnimatedBeam shows data moving Bank → Consent → SahayakFin → Lender (summary only); NumberTicker for stats | — |

- **Easing:** `[0.22, 1, 0.36, 1]` (ease-out-quint) for entrances; spring only on toggles.
- **Never animate text people need to read** while they read it. No infinite loops inside the app (landing hero only).
- Wrap animations in a `useReducedMotion()` check.

## 6. Component libraries and plugins (install once, in this order)

**npm packages** (Mihir's main session installs them all at once, at the start of Phase 2):

```bash
cd frontend
npm i motion recharts lucide-react sonner vaul clsx tailwind-merge class-variance-authority
# shadcn/ui: use the CLI that matches your Tailwind version
#   Tailwind v4 →  npx shadcn@latest init
#   Tailwind v3 →  npx shadcn@2.3.0 init        (shadcn docs: "If you are using Tailwind v3, use shadcn@2.3.0")
npx shadcn@latest add button card badge tabs dialog sheet drawer tooltip slider progress select input label separator skeleton table toggle-group chart avatar dropdown-menu sonner
```

(If you used `shadcn@2.3.0 init`, use `npx shadcn@2.3.0 add ...` for the components too.)

| Library | What we use it for |
| --- | --- |
| **shadcn/ui** | Accessible base components (Radix) styled with our tokens. Edit `components.json` and the CSS variables to map `--primary` → brand-700 etc. |
| **21st.dev** | A community registry of shadcn-style components. Each component page has **"Copy prompt"**: paste it into Claude Code and it adds the component to the project and fits it to our theme. Good picks (search by name on 21st.dev): **Number Ticker** (landing stats, score count-up), **Animated Beam** (landing "how it works" data flow), **Border Beam** / shine border (hero CTA card), **Bento grid** (landing pillars), **Marquee** (landing "works with UPI, NEFT, AA" strip), **Stepper** (onboarding), **Timeline** (repayment). Take at most ~6 components so the site stays consistent. |
| **Magic UI** components (on 21st.dev under @magicui) | Same "Copy prompt" flow. They depend on `motion`/`framer-motion`. |
| **Recharts via shadcn `chart`** | All charts in §4. |
| **Motion** | Everything in §5. |
| **Sonner** + **vaul** | Toasts and mobile bottom sheets (shadcn `sonner` and `drawer`). |

**Claude Code plugins / MCP** (each person installs them in their own Claude Code; nothing goes in the repo):

| Tool | Install | Why |
| --- | --- | --- |
| **frontend-design** (official Anthropic plugin) | `/plugin install frontend-design@claude-plugins-official` | Better-looking, less generic UI from Claude. **Mihir must; others optional.** |
| **21st.dev Magic MCP** (optional) | Get a free API key from your 21st.dev account, then in a terminal: `claude mcp add magic --scope user -e API_KEY="<your-key>" -- npx -y @21st-dev/magic@latest`. **Never commit the key.** | Lets Claude search and generate 21st.dev components directly. If it fails in 5 minutes, skip it and use "Copy prompt" instead. |
| **Playwright MCP** (optional, night shift) | `claude mcp add playwright -- npx -y @playwright/mcp@latest` | Lets Claude open the site, take screenshots and check layouts at 360 / 768 / 1440 px |

**Don't add:** Aceternity, three.js / WebGL, Lottie, extra chart libraries, a second icon set, or a CSS-in-JS library. They're heavy, slow the build, and make the site inconsistent.

## 7. Landing page (`/`): section by section

1. **Top nav:**
   - Logo "SahayakFin" (wordmark, brand-700, "Fin" in ink).
   - Links: How it works · Fairness · Privacy · For lenders.
   - Language switch, buttons "Lender login" (ghost) + "Check my score" (primary).
2. **Hero** (brand-900 background, white text, marigold underline under "credit history"):
   - H1: "Your UPI history is your credit history."
   - Sub: "No salary slip? No CIBIL score? SahayakFin reads your bank statement fairly, explains every point, and shows only loans you can repay in a bad week."
   - CTAs: "Check my score (demo)" → `/app/start`, "See how it's fair" → `/fairness`.
   - Right side: an animated sample gauge (81, Strong) inside a white card with BorderBeam.
3. **Problem strip:** two NumberTickers.
   - "7.7 million gig workers in 2020–21 → 23.5 million by 2029–30" (source line: NITI Aayog, 2022).
   - "Most have no formal credit history."
4. **How it works** (3 steps + AnimatedBeam): 1 "Share with consent" (Bank → Consent) · 2 "We read habits, not wealth" (SahayakFin) · 3 "Get loans you can repay" (Lender sees a summary only).
5. **The 4 pillars** (bento grid): Steady income · Saving habit · Bills on time · Living within income. Each has an icon, one line and a tiny mini-chart.
6. **Fairness proof:**
   - Sunita (₹12k, steady) vs Arjun (₹40k, uneven), side by side with their scores.
   - Line: "Doubling every rupee doesn't change a score. Neither does a name."
   - Button "Open the Fairness Lab".
7. **Privacy promise:** 4 icons. "We never ask for passwords, PINs or OTPs" · "Account numbers masked" · "Lenders see a summary only" · "One tap deletes your data".
8. **For lenders:** "Pre-screened, explainable applicants. Weekly repayments sized to bad weeks." → "Lender login".
9. **Footer:** "Prototype with synthetic data · Not a CIBIL score · Built for the Fintech & Financial Inclusion track". Team names.

## 8. Do and don't

| Do | Don't |
| --- | --- |
| One primary action per card; rupees everywhere; a band word next to every band colour | Red for a low score (grey for BUILDING); jargon without a tooltip; walls of text |
| Big touch targets (≥ 44 px), visible focus rings, `aria-label` on icon buttons | Animations longer than 1 s inside the app; autoplay sound |
| Tooltips with info icons for APR, KFS, "bad week" | Fake precision (show the score as an integer and money in whole rupees) |
| Every chart with a one-sentence takeaway caption | Stock photos of people (use icons and simple illustrations) |
