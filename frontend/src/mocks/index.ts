import type {
  Loan, Me, OffersResponse, ScoreResult, StatementResult, User, WeekGroup, Repayment,
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
    insurance: [],
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
    return { access_token: 'mock-token', user }
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
  return fail('NOT_FOUND', `No mock for ${method} ${path}`)
}
