import type {
  Goal, Loan, Me, OffersResponse, Reminder, ScoreResult, StatementResult, User, WeekGroup, Repayment,
} from '../api/types'

const user: User = {
  id: 'u1', display_name: 'Ravi Shinde', phone_masked: 'XXXXXX0001', language: 'en', role: 'USER',
}

const score: ScoreResult = {
  score: 81, band: 'STRONG', confidence: 'HIGH', provisional: false,
  weeks_observed: 12, as_of: '2026-10-25',
  components: {
    income_stability: { value: 97.5, weight: 0.3, available: true },
    savings_habit: { value: 50, weight: 0.25, available: true },
    bill_discipline: { value: 83.33, weight: 0.25, available: true },
    expense_health: { value: 91.67, weight: 0.2, available: true },
  },
  metrics: {
    median_weekly_income_paise: 500000, p25_weekly_income_paise: 487500,
    expense_ratio: 0.8414, weeks_in_surplus: 10, bills_on_time: 5, bills_total: 6,
    bounces: 0, savings_weeks: 6, categorised_share: 0.93,
  },
  reasons: [
    { code: 'FEW_SAVINGS_WEEKS', component: 'savings_habit', params: { weeks: 6, of: 12 } },
    { code: 'BILLS_LATE', component: 'bill_discipline', params: { late: 1, of: 6 } },
  ],
  tips: [
    { code: 'SAVE_EVERY_WEEK', points: 13, params: { min_amount_paise: 2000 } },
    { code: 'PAY_BILLS_ON_TIME', points: 4, params: {} },
  ],
  engine_version: 'fts-2.0',
}

const statement: StatementResult = {
  source_id: 's1', kind: 'CSV', period: { from: '2026-07-28', to: '2026-10-25' },
  weeks_covered: 12, txn_count: 214, warnings: [],
  stages: [
    { code: 'READ', ms: 180 }, { code: 'MASK', ms: 40 },
    { code: 'CATEGORISE', ms: 35 }, { code: 'SCORE', ms: 12 },
  ],
  score,
}

const weeks: WeekGroup[] = [
  {
    week_start: '2026-10-19', income_paise: 512000, expense_paise: 426000,
    txns: [
      { id: 't1', date: '2026-10-24', amount_paise: 220000, direction: 'CR', narration_masked: 'QUICKBITE PAYOUT', category: 'PLATFORM_PAYOUT', kind: 'INCOME', flags: [], user_corrected: false },
      { id: 't2', date: '2026-10-23', amount_paise: 180000, direction: 'DR', narration_masked: 'UPI/DR/XXXX4521/RENT P-3F2A9C1E', category: 'RENT', kind: 'EXPENSE', flags: [], user_corrected: false },
      { id: 't3', date: '2026-10-22', amount_paise: 45000, direction: 'DR', narration_masked: 'HPCL PETROL PUMP', category: 'FUEL', kind: 'EXPENSE', flags: [], user_corrected: false },
      { id: 't4', date: '2026-10-21', amount_paise: 30000, direction: 'DR', narration_masked: 'UPI/DR KIRANA STORE', category: 'FOOD', kind: 'EXPENSE', flags: [], user_corrected: false },
      { id: 't5', date: '2026-10-20', amount_paise: 15000, direction: 'DR', narration_masked: 'NACH RTN CHG', category: 'FEES_CHARGES', kind: 'EXPENSE', flags: ['BOUNCE'], user_corrected: false },
    ],
  },
  {
    week_start: '2026-10-12', income_paise: 498000, expense_paise: 410000,
    txns: [
      { id: 't6', date: '2026-10-17', amount_paise: 250000, direction: 'CR', narration_masked: 'ZIPRIDE PAYOUT', category: 'PLATFORM_PAYOUT', kind: 'INCOME', flags: [], user_corrected: false },
      { id: 't7', date: '2026-10-16', amount_paise: 60000, direction: 'DR', narration_masked: 'IOCL FUEL', category: 'FUEL', kind: 'EXPENSE', flags: [], user_corrected: false },
      { id: 't8', date: '2026-10-15', amount_paise: 20000, direction: 'DR', narration_masked: 'RD INSTALMENT POST OFFICE', category: 'SAVINGS', kind: 'SAVINGS', flags: [], user_corrected: false },
    ],
  },
  {
    week_start: '2026-10-05', income_paise: 505000, expense_paise: 398000,
    txns: [
      { id: 't9', date: '2026-10-10', amount_paise: 240000, direction: 'CR', narration_masked: 'QUICKBITE PAYOUT', category: 'PLATFORM_PAYOUT', kind: 'INCOME', flags: [], user_corrected: false },
      { id: 't10', date: '2026-10-08', amount_paise: 25000, direction: 'DR', narration_masked: 'RECHARGE PREPAID', category: 'PHONE', kind: 'EXPENSE', flags: [], user_corrected: false },
    ],
  },
]

const kfs = {
  advertised_rate_pct: 24, apr_pct: 32.0, instalment_paise: 30678, fee_paise: 15000,
  net_disbursed_paise: 735000, total_repayable_paise: 797627, total_cost_paise: 62627,
  n_instalments: 26, late_fee_paise: 5000, cooling_off_days: 3,
}

function offers(requested: number): OffersResponse {
  return {
    requested_paise: requested,
    safe_amount_paise: 760000,
    loans: [
      { id: 'o1', lender: { id: 'l1', name: 'MFI Alpha' }, product_id: 'p1', amount_paise: 750000, weeks: 26, frequency: 'WEEKLY', rate_pct: 24, fee_pct: 2, kfs, fits_safe_instalment: true, eligible: 'ELIGIBLE', reason: null },
      { id: 'o2', lender: { id: 'l2', name: 'MFI Beta' }, product_id: 'p2', amount_paise: 750000, weeks: 26, frequency: 'WEEKLY', rate_pct: 21, fee_pct: 1, kfs: { ...kfs, advertised_rate_pct: 21, apr_pct: 24.2, instalment_paise: 29800, fee_paise: 7500, net_disbursed_paise: 742500, total_repayable_paise: 774800, total_cost_paise: 32300 }, fits_safe_instalment: true, eligible: 'NEEDS_REVIEW', reason: null },
      { id: 'o3', lender: { id: 'l3', name: 'MFI Gamma' }, product_id: 'p3', amount_paise: 0, weeks: 26, frequency: 'WEEKLY', rate_pct: 18, fee_pct: 1.5, kfs: { ...kfs, advertised_rate_pct: 18, apr_pct: 21, instalment_paise: 0, fee_paise: 0, net_disbursed_paise: 0, total_repayable_paise: 0, total_cost_paise: 0 }, fits_safe_instalment: false, eligible: 'OUTSIDE', reason: 'BAND_TOO_LOW' },
    ],
    insurance: [
      { id: 'i1', name: 'PM Suraksha Bima Yojana', provider: 'Govt of India', premium_paise: 2000, premium_period: 'YEAR', cover_paise: 200000000, is_govt_scheme: true, demo: false },
      { id: 'i2', name: 'Hospital Cash Cover', provider: 'Demo Insurer', premium_paise: 1000, premium_period: 'WEEK', cover_paise: 50000, is_govt_scheme: false, demo: true },
      { id: 'i3', name: 'Loan Life Cover', provider: 'Demo Insurer', premium_paise: 500, premium_period: 'WEEK', cover_paise: 750000, is_govt_scheme: false, demo: true },
    ],
  }
}

function buildSchedule(): Repayment[] {
  const out: Repayment[] = []
  const start = new Date('2026-11-06')
  for (let i = 0; i < 26; i++) {
    const d = new Date(start.getTime() + i * 7 * 86400000)
    out.push({ id: `r${i + 1}`, seq: i + 1, due_date: d.toISOString().slice(0, 10), amount_paise: 30678, status: 'UPCOMING' })
  }
  return out
}

let loan: Loan | null = null
let goal: Goal | null = null
let revoked = false

function fail(code: string, message: string): Error {
  const e = new Error(message) as Error & { code: string }
  e.code = code
  return e
}

export function mocks(method: string, path: string, body?: unknown): unknown {
  const p = path.split('?')[0]
  const b = (body ?? {}) as Record<string, any>

  if (method === 'POST' && p === '/auth/otp/request') return { request_id: 'req1', demo_otp: '123456' }
  if (method === 'POST' && p === '/auth/otp/verify') {
    if (b.otp !== '123456') return fail('OTP_INVALID', 'Invalid code')
    const lender = String(b.phone ?? '').startsWith('999999999')
    return { access_token: 'mock-token', user: lender ? { ...user, display_name: 'MFI Alpha', role: 'LENDER' as const } : user }
  }
  if (method === 'GET' && p === '/me') {
    const me: Me = { user, has_active_consent: false, has_score: false, has_loan: !!loan }
    return me
  }
  if (method === 'PATCH' && p === '/me') return { ...user, language: b.language ?? 'en' }
  if (method === 'POST' && p === '/consents') {
    return {
      id: 'c1', purpose: 'LOAN_ASSESSMENT', fi_types: ['DEPOSIT'], range_from: '2026-07-28', range_to: '2026-10-25',
      data_life_days: 30, fetch_type: 'ONETIME', status: 'ACTIVE', created_at: '2026-10-29T00:00:00+05:30', expires_at: '2026-11-28T00:00:00+05:30',
    }
  }
  if (method === 'POST' && (p === '/statements' || p === '/aa/fetch')) return statement
  if (method === 'GET' && p === '/transactions') return { weeks }
  if (method === 'GET' && p === '/scores/latest') return { ...score, id: 'sc1', created_at: '2026-10-29T00:00:00+05:30' }
  if (method === 'POST' && p === '/scores/what-if') {
    const tip = score.tips.find((t) => t.code === b.tip_code)
    if (!tip) return fail('BAD_TIP', 'Unknown tip')
    return { score_before: 81, score_after: Math.min(100, 81 + tip.points), points: tip.points }
  }
  if (method === 'GET' && p === '/offers') {
    const m = /requested_paise=(\d+)/.exec(path)
    return offers(m ? Number(m[1]) : 1000000)
  }
  if (method === 'POST' && p.startsWith('/offers/') && p.endsWith('/accept')) {
    loan = {
      id: 'ln1', lender_name: 'MFI Alpha', principal_paise: b.amount_paise ?? 750000,
      instalment_paise: 30678, weeks: b.weeks ?? 26, start_date: '2026-10-30',
      payout_weekday: 'FRIDAY', schedule: buildSchedule(),
    }
    return loan
  }
  if (method === 'GET' && p === '/loans') return loan ? [loan] : []
  if (method === 'POST' && p.startsWith('/repayments/') && p.endsWith('/pay')) {
    const id = p.split('/')[2]
    const r = loan?.schedule.find((x) => x.id === id)
    if (r) { r.status = 'PAID'; r.paid_at = new Date().toISOString() }
    return r
  }
  if (method === 'PATCH' && p.startsWith('/transactions/')) {
    const id = p.split('/')[2]
    for (const w of weeks) for (const x of w.txns) if (x.id === id) { x.category = b.category; x.user_corrected = true }
    const tx = weeks.flatMap((w) => w.txns).find((x) => x.id === id)
    return { txn: tx, score: { ...score, score: 83 } }
  }
  if (method === 'GET' && p === '/affordability') {
    return {
      safe_weekly_paise: 31000, p25_weekly_surplus_paise: 62000, median_weekly_surplus_paise: 80000,
      median_weekly_income_paise: 500000, existing_weekly_debt_paise: 0, rbi_cap_weekly_paise: 250000,
      payout_weekday: 'FRIDAY', loan_max_paise: { '13': 380000, '26': 760000, '52': 1200000 },
    }
  }
  if (method === 'POST' && p === '/affordability/stress') {
    const s = Number(b.shock)
    const light = s <= 0.1 ? 'GREEN' : s <= 0.2 ? 'AMBER' : 'RED'
    return {
      weeks_covered: light === 'GREEN' ? 12 : light === 'AMBER' ? 10 : 8, weeks_total: 12, light,
      buffer_covers: light !== 'RED', shortfall_paise: light === 'RED' ? 4000 : 0,
      advice: light === 'GREEN' ? 'OK' : 'CONSIDER_LONGER_TENURE',
    }
  }
  if (method === 'GET' && p === '/reminders') {
    const r = (id: string, code: string, at: string): Reminder => ({
      id, repayment_id: 'r1', send_at: at, code, sent: true,
      params: { amount_paise: 30678, due_date: '2026-11-06', lender: 'MFI Alpha' },
    })
    return loan ? [r('m1', 'REMINDER_T_MINUS_2', '2026-11-04T10:00:00+05:30'), r('m2', 'REMINDER_DUE_TODAY', '2026-11-06T09:30:00+05:30')] : []
  }
  if (method === 'POST' && p === '/demo/advance-clock') return { now: '2026-11-05T10:00:00+05:30' }
  if (method === 'POST' && p === '/demo/reset') { loan = null; goal = null; revoked = false; return { ok: true } }
  if (method === 'GET' && p === '/wellness/weekly') {
    return {
      weeks: [
        { week_start: '2026-09-28', income_paise: 480000, expense_paise: 400000, by_category: { FUEL: 55000, FOOD: 90000, RENT: 120000, BILLS: 30000, PHONE: 25000, OTHER: 80000 } },
        { week_start: '2026-10-05', income_paise: 505000, expense_paise: 398000, by_category: { FUEL: 58000, FOOD: 85000, RENT: 120000, BILLS: 28000, PHONE: 25000, OTHER: 82000 } },
        { week_start: '2026-10-12', income_paise: 498000, expense_paise: 410000, by_category: { FUEL: 60000, FOOD: 92000, RENT: 120000, BILLS: 30000, PHONE: 25000, OTHER: 83000 } },
        { week_start: '2026-10-19', income_paise: 512000, expense_paise: 426000, by_category: { FUEL: 78000, FOOD: 95000, RENT: 120000, BILLS: 30000, PHONE: 25000, OTHER: 78000 } },
      ],
      avg4_by_category: { FUEL: 62750, FOOD: 90500, RENT: 120000, BILLS: 29500, PHONE: 25000, OTHER: 80750 },
      nudges: [
        { code: 'PAYDAY_SAVE', params: { amount_paise: 512000, suggest_paise: 10000 } },
        { code: 'CATEGORY_SPIKE', params: { category: 'FUEL', pct: 24 } },
        { code: 'BILL_SOON', params: { category: 'BILLS', day: 5 } },
      ],
    }
  }
  if (method === 'GET' && p === '/goals') return goal ? [goal] : []
  if (method === 'POST' && p === '/goals') {
    goal = { id: 'g1', name: b.name, target_paise: b.target_paise, weekly_target_paise: 6000, saved_paise: 12000, weeks_left: Math.ceil(b.target_paise / 6000) }
    return goal
  }
  if (method === 'GET' && p === '/audit') {
    return [
      { ts: '2026-10-29T01:12:00+05:30', actor_role: 'LENDER', actor_name: 'MFI Alpha', action: 'VIEW_SCORE_SUMMARY', purpose: 'LOAN_ASSESSMENT' },
      { ts: '2026-10-29T00:40:00+05:30', actor_role: 'USER', actor_name: 'Ravi Shinde', action: 'SHARED_WITH_LENDER', purpose: 'LOAN_ASSESSMENT' },
      { ts: '2026-10-29T00:20:00+05:30', actor_role: 'USER', actor_name: 'Ravi Shinde', action: 'STATEMENT_UPLOADED', purpose: 'LOAN_ASSESSMENT' },
      { ts: '2026-10-29T00:18:00+05:30', actor_role: 'USER', actor_name: 'Ravi Shinde', action: 'CONSENT_CREATED', purpose: 'LOAN_ASSESSMENT' },
    ]
  }
  if (method === 'GET' && p === '/consents') {
    return [{
      id: 'c1', purpose: 'LOAN_ASSESSMENT', fi_types: ['DEPOSIT'], range_from: '2026-07-28', range_to: '2026-10-25',
      data_life_days: 30, fetch_type: 'ONETIME', status: revoked ? 'REVOKED' : 'ACTIVE',
      created_at: '2026-10-29T00:00:00+05:30', expires_at: '2026-11-28T00:00:00+05:30',
    }]
  }
  if (method === 'POST' && p.startsWith('/consents/') && p.endsWith('/revoke')) {
    revoked = true
    return { consent: { id: 'c1', status: 'REVOKED' }, deleted: { transactions: 214, sources: 1 } }
  }
  if (method === 'GET' && p === '/lenders') {
    return [{ id: 'l1', name: 'MFI Alpha', min_band: 'FAIR' }, { id: 'l2', name: 'MFI Beta', min_band: 'GOOD' }, { id: 'l3', name: 'MFI Gamma', min_band: 'STRONG' }]
  }
  if (method === 'POST' && p === '/shares') return { id: `sh-${b.lender_id}`, lender_id: b.lender_id, created_at: '2026-10-29T00:00:00+05:30' }
  if (method === 'DELETE' && p.startsWith('/shares/')) return { ok: true }
  if (method === 'GET' && p === '/fairness/report') {
    const codes = ['SCALE_HALF', 'SCALE_DOUBLE', 'NAME_SWAP', 'STEADY_BEATS_RICH', 'MONOTONIC_SAVINGS', 'MONOTONIC_BILLS', 'MISSING_IS_NOT_BAD', 'NO_PROTECTED_INPUTS']
    return {
      tests: codes.map((c) => ({ code: c, passed: true, detail: 'Checked on all demo personas: score unchanged.' })),
      personas: [
        { name: 'Ravi', monthly_income_paise: 2200000, score: 81, band: 'STRONG', confidence: 'HIGH' },
        { name: 'Sunita', monthly_income_paise: 1200000, score: 78, band: 'GOOD', confidence: 'HIGH' },
        { name: 'Arjun', monthly_income_paise: 4000000, score: 52, band: 'FAIR', confidence: 'MEDIUM' },
        { name: 'Meena', monthly_income_paise: 900000, score: 34, band: 'BUILDING', confidence: 'LOW' },
      ],
    }
  }
  if (method === 'GET' && p === '/lender/applicants') {
    return [
      { applicant_ref: 'APP-7F3A', score: 81, band: 'STRONG', confidence: 'HIGH', reasons: ['FEW_SAVINGS_WEEKS', 'BILLS_LATE'], safe_weekly_paise: 31000, requested_paise: 1000000, eligible: 'ELIGIBLE' },
      { applicant_ref: 'APP-2C91', score: 78, band: 'GOOD', confidence: 'HIGH', reasons: ['FEW_SURPLUS_WEEKS'], safe_weekly_paise: 18000, requested_paise: 800000, eligible: 'ELIGIBLE' },
      { applicant_ref: 'APP-90B4', score: 52, band: 'FAIR', confidence: 'MEDIUM', reasons: ['INCOME_UNEVEN', 'NO_SAVINGS_SEEN'], safe_weekly_paise: 9000, requested_paise: 1000000, eligible: 'NEEDS_REVIEW' },
      { applicant_ref: 'APP-11DE', score: 34, band: 'BUILDING', confidence: 'LOW', reasons: ['THIN_FILE'], safe_weekly_paise: 4000, requested_paise: 500000, eligible: 'OUTSIDE' },
    ]
  }
  if (method === 'PUT' && p === '/lender/rules') return { rules: b, eligible_before: 2, eligible_after: b.min_band === 'BUILDING' ? 4 : b.min_band === 'FAIR' ? 3 : 2 }
  return fail('NOT_FOUND', `No mock for ${method} ${path}`)
}
