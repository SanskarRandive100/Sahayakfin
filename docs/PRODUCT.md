# SahayakFin: product spec (final, build version)

**Pitch line:** "Your CIBIL score is blank, but your UPI history isn't. SahayakFin reads it fairly, explains every point, and only lends you what you can repay in a bad week."

**Primary user:** a delivery rider or street vendor. They are paid digitally, have no salary slip or ITR, and need ₹2,000–₹15,000 (bike repair, stock).

**Three differentiators:**

1. **Stability, not wealth.** Every score part is a ratio or a count of weeks, so a steady ₹12k vendor can outscore an erratic ₹40k driver. We prove it live.
2. **Bad-week affordability.** The loan size comes from the worker's own worst weeks. It is capped below RBI's microfinance 50% limit and repaid weekly on payout day.
3. **Consent you can see and undo.** AA-style consent. The lender sees only a summary. Revoking deletes the data, on screen.

## 1. How we win each judging criterion

| Criterion (weight) | What we build | Demo moment that proves it |
| --- | --- | --- |
| Algorithm fairness & logic (30) | Rule-based 4-component score (CONTRACTS §3). No protected attributes. Confidence kept separate. Reasons + tips. Fairness Lab with automated tests. Round-trip and self-transfer gaming rules. | Fairness screen: Sunita (₹12k) beats Arjun (₹40k); "double every rupee" → same score; "swap name/gender" → same score; tests all green |
| Data privacy & security (25) | Consent object (purpose, range, data life, expiry); raw file never stored; masking + HMAC payee tokens; AES-GCM narrations; JWT + roles; lender summary-only with a per-lender share consent; audit log; revoke → cascade delete; upload validation; DPDP principles | Show masked rows right after upload; lender view has no transactions; audit entry appears; revoke → "214 transactions deleted" |
| User experience (20) | Language first (en/hi/mr); one decision per screen; rupees not %; band words + colours; read-aloud; phone frame; weekly icons breakdown; WhatsApp-style reminders | The whole flow in Hindi, read-aloud on the score screen |
| System architecture (15) | React + FastAPI + PostgreSQL + pdfplumber; pure, unit-tested scoring package; versioned REST API; documented schema; mock AA with FIU/AA/FIP roles | One slide: architecture diagram + API list + ER table; `pytest` green on screen |
| Pitch & demo (10) | Live PDF upload → animated pipeline (Read → Mask → Categorise → Score) → score in ~3 s | The whole 5-minute script below, with a recorded backup |

## 2. Feature scope

The **P0** path must work end to end before anything else.

| # | Feature | Priority | Owner(s) |
| --- | --- | --- | --- |
| 1 | Language pick (EN/HI/MR) + phone/OTP login (OTP 123456) | P0 | Mihir, Sanskar |
| 2 | Consent screen + create consent; simulated AA fetch ("Connect bank (demo)") | P0 | Mihir, Sanskar |
| 3 | Upload PDF (incl. locked) / CSV → parse → mask → categorise → score, with an animated stage list | P0 | Rajat (ingest), Sanskar (endpoint), Mihir (UI) |
| 4 | Review transactions by week; change a category → score updates | P0 | all |
| 5 | Score screen: gauge, band word, confidence, 4 component bars, 2 reasons, tips with "+N points" | P0 | Rajat, Mihir |
| 6 | Offers: requested amount → "safe for you" amount, 3 MFIs with eligibility, KFS card | P0 | Rajat (math), Sanskar (endpoint), Mihir |
| 7 | Sachet insurance cards (3) | P0 | Sanskar (seed), Mihir |
| 8 | Accept offer → weekly schedule on payout day; reminders in chat style; "advance clock" demo button; pay instalment | P0 | Sanskar, Mihir |
| 9 | Money tab: weekly stacked bar by category (icons), this week vs 4-week average, one savings goal, nudges | P0 | Rajat (aggregates), Sanskar (endpoint), Mihir |
| 10 | Privacy centre: consents, Revoke (shows deleted counts), "who saw my data" audit list, lender sharing toggle | P0 | Sanskar, Mihir |
| 11 | Fairness Lab screen (desktop): persona comparison + automated fairness tests | P0 | Rajat (report), Mihir |
| 12 | Income-drop slider (−10/−20/−30%) on the offer screen | P1 | Rajat, Mihir |
| 13 | Lender dashboard (desktop): applicants (masked) + adjust rules → eligible before/after | P1 | Sanskar, Mihir |
| 14 | Read-aloud (Web Speech API, hi-IN / en-IN; mr falls back to hi-IN) | P1 | Mihir |
| 15 | ALT BANK second PDF layout | P1 | Rajat |
| 16 | "Check any loan offer" form (outside offers; unknown fields shown as "not provided") | P2 | Rajat, Mihir |
| 17 | Mark up to 2 unusual weeks (illness/breakdown) to exclude from stability | P2 | Rajat, Mihir |
| 18 | Hosted deployment | P2 | Sanskar |

**Explicitly cut:** Prosperity Network, sponsors, purchase planner with price history, real SMS/WhatsApp, real AA, ML model.

## 3. Screens (user app, phone frame)

1. **Language:** three big buttons: English / हिंदी / मराठी.
2. **Login:** phone → OTP (demo OTP shown in small grey text).
3. **Consent:** icons for "What we read" (bank transactions, last 90 days), "Why" (to check a small loan), "How long" (30 days), "You can stop anytime". Allow / Deny.
4. **Connect:**
   - "Upload bank statement" (PDF/CSV, password field appears on `PDF_PASSWORD_REQUIRED`).
   - "Connect bank (demo AA)".
   - Small "Try a demo profile" link.
5. **Processing:** the four stages tick one by one using the returned `stages` (minimum 400 ms each, so judges see it), then go to Review.
6. **Check your transactions:** weeks as collapsible cards. Each row shows an icon, masked text and the amount. Tapping a row opens a category picker; saving it shows a toast "Score updated: 78 → 80".
7. **Your score:**
   - Semi-circle gauge with band colour and the band word.
   - A "Provisional" chip if LOW confidence. Confidence label.
   - 4 bars with one plain line each.
   - 2 reasons, plus tips as "Do this → +N points".
   - Read-aloud button.
8. **Loans & insurance:**
   - Input "How much do you need?" → "Safe for you: ₹X".
   - Offer cards (eligible first), each with a KFS card: You receive, Pay every week, Total you pay back, Total cost, Advertised vs true yearly cost, Fits your budget ✓.
   - Income-drop slider.
   - Insurance cards.
9. **My loan:** schedule list (paid / upcoming / overdue); a WhatsApp-style chat of reminders; "Pay ₹307" button; "Advance 1 day" demo button (small).
10. **Money:** weekly stacked bars by category; this week vs average; savings goal card (target, weekly target, progress); nudges.
11. **Privacy:** active consent card + Revoke; data shared with lenders (toggle per lender); audit log list.

**Bottom nav:** Home (score) · Money · Loans · Privacy.

**Desktop routes:** `/fairness` (Fairness Lab) and `/lender` (lender dashboard; login with a lender phone).

## 4. Personas (synthetic, generated by `data/generate_personas.py`, seed 42, statements end 2026-10-25)

| Persona | Story | Income | Pattern | Savings | Bills | Special |
| --- | --- | --- | --- | --- | --- | --- |
| Ravi (demo hero) | Delivery rider, needs ₹10,000 for bike repair | ~₹21k/month, weekly payout on Friday from "QUICKBITE" + some UPI tips | fairly steady | RD transfer in ~half the weeks | rent, electricity, recharge mostly on time | locked PDF `RAVI0101` |
| Sunita | Vegetable vendor | ~₹12k/month, daily small UPI receipts + some cash deposits | very steady | ₹150 every week to RD | all on time | proves "steady beats rich" |
| Arjun | Cab driver | ~₹40k/month, payouts from "ZIPRIDE", very uneven | volatile, some deficit weeks | none | 3 of 6 late, 1 NACH bounce | has an existing EMI; one round-trip transfer to a friend (gaming test) |
| Meena | New to digital, tailor | ~₹15k/month | steady | 3 of 5 weeks | 2/2 | only 5 complete weeks → LOW confidence |

All names, platforms, banks and lenders are fictional.

## 5. Privacy and security checklist (all must be visibly true in the demo)

- The raw file is processed in memory and never written to disk. Only its SHA-256 is stored.
- PDF password is used once, never stored or logged.
- Upload checks:
  - file signature (`%PDF-` or valid UTF-8 CSV)
  - ≤ 5 MB, ≤ 20 pages
  - reject PDFs containing `/JavaScript`, `/JS`, `/EmbeddedFile` or `/Launch`
- Masking per CONTRACTS §2.4; narrations encrypted with AES-256-GCM (`DATA_KEY` env, base64 32 bytes).
- JWT HS256 (`JWT_SECRET` env), 15-minute expiry is fine for the demo (refresh not needed; long-lived demo tokens are allowed if `DEMO_MODE=true`).
- Roles enforced in dependencies. A lender endpoint never returns transactions, names or phones.
- An audit row is written on every lender view, upload, consent change and share.
- Revoke → cascade delete. Expired consent → same.
- No personal data in logs. CORS is limited to the frontend origin.
- OTP request rate limit: 5 per minute per phone (in-memory is fine).
- **DPDP Act 2023 principles:** notice in plain language and the user's language, purpose limitation, minimisation, erasure on withdrawal. We claim alignment, not certification.

## 6. Demo script (5 minutes; pitch numbers come from the real generated data, so update after generation)

1. **Hook:** "Ravi needs ₹10,000 to fix his bike. No salary slip, no CIBIL. Banks say no."
2. Hindi → login → consent screen (purpose, 90 days, kept 30 days) → Allow.
3. Upload Ravi's locked PDF → password → stages tick (Read, Mask, Categorise, Score) → masked rows.
4. Fix one wrong category → "Score updated".
5. Score screen: band, confidence, reasons, tip with +points; tap read-aloud.
6. Loans: ask ₹10,000 → "Safe for you: ₹7,600" → KFS card "advertised 24%, true yearly cost 32%, you receive ₹7,350" → slider −20% → amber.
7. Accept → weekly schedule on Fridays → advance clock → Hindi reminder in chat.
8. Desktop Fairness Lab: Sunita vs Arjun; scale test; name swap; all tests pass.
9. Lender view: summary only → Ravi's Privacy tab shows "MFI Alpha viewed your score summary".
10. Revoke → "214 transactions deleted" → close: "Your UPI history is your credit history. We just read it fairly."

**Backup:** recorded video of the full run, plus the pre-seeded personas.
