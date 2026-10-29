import { request } from './client'
import type {
  Affordability, Applicant, AuditRow, Category, Consent, FairnessReport, Goal, Lang, LenderInfo,
  LenderRules, Loan, Me, OffersResponse, Reminder, Repayment, ScoreResult, Share, StatementResult,
  StressResult, TxnOut, User, WeekGroup, Wellness,
} from './types'

type OtpRequest = { request_id: string; demo_otp: string }
type OtpVerify = { access_token: string; user: User }

export const api = {
  requestOtp: (phone: string) =>
    request<OtpRequest>('POST', '/auth/otp/request', { phone }),

  verifyOtp: (phone: string, otp: string) =>
    request<OtpVerify>('POST', '/auth/otp/verify', { phone, otp }),

  getMe: () => request<Me>('GET', '/me'),

  patchMe: (patch: { language: Lang }) => request<User>('PATCH', '/me', patch),

  createConsent: () =>
    request<Consent>('POST', '/consents', {
      purpose: 'LOAN_ASSESSMENT',
      fi_types: ['DEPOSIT'],
      range_days: 90,
      data_life_days: 30,
      fetch_type: 'ONETIME',
    }),

  uploadStatement: (file: File, consentId: string, password?: string) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('consent_id', consentId)
    if (password) fd.append('password', password)
    return request<StatementResult>('POST', '/statements', fd, { isForm: true })
  },

  aaFetch: (consentId: string, persona: string) =>
    request<StatementResult>('POST', '/aa/fetch', { consent_id: consentId, persona }),

  getTransactions: (weeks = 12) =>
    request<{ weeks: WeekGroup[] }>('GET', `/transactions?weeks=${weeks}`),

  getLatestScore: () => request<ScoreResult & { id: string; created_at: string }>('GET', '/scores/latest'),

  whatIf: (tip_code: string) =>
    request<{ score_before: number; score_after: number; points: number }>(
      'POST', '/scores/what-if', { tip_code },
    ),

  getAffordability: () => request<Affordability>('GET', '/affordability'),

  stress: (shock: number, weekly_instalment_paise: number) =>
    request<StressResult>('POST', '/affordability/stress', {
      shock, weekly_instalment_paise,
    }),

  getOffers: (requested_paise: number) =>
    request<OffersResponse>('GET', `/offers?requested_paise=${requested_paise}`),

  acceptOffer: (id: string, amount_paise: number, weeks: number) =>
    request<Loan>('POST', `/offers/${id}/accept`, { amount_paise, weeks }),

  getLoans: () => request<Loan[]>('GET', '/loans'),

  payRepayment: (id: string) => request<Repayment>('POST', `/repayments/${id}/pay`, {}),

  patchTxn: (id: string, category: Category) =>
    request<{ txn: TxnOut; score: ScoreResult }>('PATCH', `/transactions/${id}`, { category }),

  getReminders: () => request<Reminder[]>('GET', '/reminders'),
  advanceClock: (days: number) => request<{ now: string }>('POST', '/demo/advance-clock', { days }),
  demoReset: () => request<{ ok: boolean }>('POST', '/demo/reset', {}),

  getWellness: (weeks = 4) => request<Wellness>('GET', `/wellness/weekly?weeks=${weeks}`),
  getGoals: () => request<Goal[]>('GET', '/goals'),
  createGoal: (name: string, target_paise: number) => request<Goal>('POST', '/goals', { name, target_paise }),

  getAudit: () => request<AuditRow[]>('GET', '/audit'),
  getConsents: () => request<Consent[]>('GET', '/consents'),
  revokeConsent: (id: string) =>
    request<{ consent: Consent; deleted: { transactions: number; sources: number } }>('POST', `/consents/${id}/revoke`, {}),
  getLenders: () => request<LenderInfo[]>('GET', '/lenders'),
  share: (lender_id: string) => request<Share>('POST', '/shares', { lender_id }),
  unshare: (id: string) => request<unknown>('DELETE', `/shares/${id}`),

  getFairness: () => request<FairnessReport>('GET', '/fairness/report'),
  getApplicants: () => request<Applicant[]>('GET', '/lender/applicants'),
  putRules: (rules: LenderRules) =>
    request<{ rules: LenderRules; eligible_before: number; eligible_after: number }>('PUT', '/lender/rules', rules),
}
