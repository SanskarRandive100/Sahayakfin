export type Band = 'STRONG' | 'GOOD' | 'FAIR' | 'BUILDING'
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'
export type Direction = 'CR' | 'DR'
export type Role = 'USER' | 'LENDER'
export type Lang = 'en' | 'hi' | 'mr'

export type Eligible = 'ELIGIBLE' | 'NEEDS_REVIEW' | 'OUTSIDE'
export type Light = 'GREEN' | 'AMBER' | 'RED'

export type Category =
  | 'PLATFORM_PAYOUT' | 'CUSTOMER_RECEIPT' | 'CASH_DEPOSIT' | 'OTHER_INCOME'
  | 'FUEL' | 'FOOD' | 'RENT' | 'BILLS' | 'PHONE' | 'TRANSPORT' | 'FAMILY'
  | 'HEALTH' | 'EDUCATION' | 'SHOPPING' | 'CASH_WITHDRAWAL' | 'EMI'
  | 'SAVINGS' | 'FEES_CHARGES' | 'SELF_TRANSFER' | 'OTHER'

export interface User {
  id: string
  display_name: string
  phone_masked: string
  language: Lang
  role: Role
}

export interface Me {
  user: User
  has_active_consent: boolean
  has_score: boolean
  has_loan: boolean
}

export interface Consent {
  id: string
  purpose: string
  fi_types: string[]
  range_from: string
  range_to: string
  data_life_days: number
  fetch_type: string
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED'
  created_at: string
  expires_at: string
  revoked_at?: string | null
}

export interface TxnOut {
  id: string
  date: string
  amount_paise: number
  direction: Direction
  narration_masked: string
  category: Category
  kind: 'INCOME' | 'EXPENSE' | 'SAVINGS' | 'DEBT' | 'IGNORED'
  flags: string[]
  user_corrected: boolean
}

export interface WeekGroup {
  week_start: string
  income_paise: number
  expense_paise: number
  txns: TxnOut[]
}

export interface Stage {
  code: 'READ' | 'MASK' | 'CATEGORISE' | 'SCORE'
  ms: number
}

export interface WeeklyPoint {
  week_start: string | null
  income_paise: number
  expense_paise: number
  surplus_paise: number
  saved: boolean
}

export interface ScoreComponent {
  value: number
  weight: number
  available: boolean
}

export interface Reason {
  code: string
  component: string
  params?: Record<string, number | string>
}

export interface Tip {
  code: string
  points: number
  params?: Record<string, number | string>
}

export interface ScoreResult {
  score: number | null
  band: Band
  confidence: Confidence
  provisional: boolean
  weeks_observed: number
  as_of: string
  components: {
    income_stability: ScoreComponent
    savings_habit: ScoreComponent
    bill_discipline: ScoreComponent
    expense_health: ScoreComponent
  }
  metrics: {
    median_weekly_income_paise: number
    p25_weekly_income_paise: number
    expense_ratio: number
    weeks_in_surplus: number
    bills_on_time: number
    bills_total: number
    bounces: number
    savings_weeks: number
    categorised_share: number
    weekly?: WeeklyPoint[]
  }
  reasons: Reason[]
  tips: Tip[]
  engine_version: string
  consent_revoked?: boolean
}

export interface StatementResult {
  source_id: string
  kind: 'PDF' | 'CSV' | 'AA'
  period: { from: string; to: string }
  weeks_covered: number
  txn_count: number
  warnings: string[]
  stages: Stage[]
  score: ScoreResult
}

export interface KFS {
  advertised_rate_pct: number
  apr_pct: number
  instalment_paise: number
  fee_paise: number
  net_disbursed_paise: number
  total_repayable_paise: number
  total_cost_paise: number
  n_instalments: number
  late_fee_paise: number
  cooling_off_days: number
}

export interface Offer {
  id: string
  lender: { id: string; name: string }
  product_id: string
  amount_paise: number
  weeks: number
  frequency: 'WEEKLY'
  rate_pct: number
  fee_pct: number
  kfs: KFS
  fits_safe_instalment: boolean
  eligible: Eligible
  reason: string | null
}

export interface Insurance {
  id: string
  name: string
  provider: string
  premium_paise: number
  premium_period: 'YEAR' | 'WEEK'
  cover_paise: number
  is_govt_scheme: boolean
  demo: boolean
}

export interface OffersResponse {
  requested_paise: number
  safe_amount_paise: number
  rbi_cap_amount_paise?: number
  loans: Offer[]
  insurance: Insurance[]
}

export interface Repayment {
  id: string
  seq: number
  due_date: string
  amount_paise: number
  status: 'UPCOMING' | 'DUE' | 'PAID' | 'OVERDUE'
  paid_at?: string | null
}

export interface Loan {
  id: string
  /** The API sends `lender: {id, name}`; older mocks used `lender_name`. Read it with `loanLender()`. */
  lender?: { id: string; name: string }
  lender_name?: string
  principal_paise: number
  instalment_paise: number
  weeks: number
  start_date: string
  payout_weekday: string
  schedule: Repayment[]
}

export interface Affordability {
  safe_weekly_paise: number
  p25_weekly_surplus_paise: number
  median_weekly_surplus_paise: number
  median_weekly_income_paise: number
  existing_weekly_debt_paise: number
  rbi_cap_weekly_paise: number
  payout_weekday: string
  loan_max_paise: Record<string, number>
}

export interface StressResult {
  weeks_covered: number
  weeks_total: number
  light: Light
  buffer_covers: boolean
  shortfall_paise: number
  advice: string
  series?: { week_start: string | null; surplus_paise: number; stressed_surplus_paise: number }[]
}

export interface ApiError {
  error: { code: string; message: string }
}

export interface Reminder {
  id: string
  repayment_id: string
  send_at: string
  code: string
  params: { amount_paise: number; due_date: string; lender: string }
  sent: boolean
}

export interface Nudge { code: string; params: Record<string, number | string> }

export interface Wellness {
  weeks: { week_start: string; income_paise: number; expense_paise: number; by_category: Record<string, number> }[]
  avg4_by_category: Record<string, number>
  nudges: Nudge[]
}

export interface Goal {
  id: string
  name: string
  target_paise: number
  weekly_target_paise: number
  saved_paise: number
  weeks_left: number
}

export interface AuditRow {
  ts: string
  actor_role: string
  actor_name: string
  action: string
  purpose: string
}

export interface LenderInfo { id: string; name: string; min_band: Band }

export interface Share { id: string; lender_id: string; created_at: string }

export interface FairnessReport {
  tests: { code: string; passed: boolean; detail: string }[]
  personas: { name: string; monthly_income_paise: number; score: number; band: Band; confidence: Confidence }[]
}

export interface Applicant {
  applicant_ref: string
  score: number
  band: Band
  confidence: Confidence
  reasons: string[]
  safe_weekly_paise: number
  requested_paise: number
  /** The API sends a boolean (the lender's own rules); mocks use the offer enum. */
  eligible: Eligible | boolean
}

export interface LenderRules { min_band: Band; max_amount_paise: number; min_weeks: number }
