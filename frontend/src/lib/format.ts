export function formatINR(paise: number): string {
  const rupees = Math.round(paise) / 100
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(rupees)
  } catch {
    return `₹${rupees.toFixed(0)}`
  }
}

export function formatDate(iso: string, lang = 'en'): string {
  const locale = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN'
  try {
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(iso))
  } catch {
    return iso
  }
}

const WEEKDAYS: Record<string, string> = {
  MON: 'MONDAY', TUE: 'TUESDAY', WED: 'WEDNESDAY', THU: 'THURSDAY', FRI: 'FRIDAY', SAT: 'SATURDAY', SUN: 'SUNDAY',
}

/** The API sends payout days as MON..SUN (CONTRACTS §4); locale keys are full names. */
export function weekdayKey(day: string | null | undefined): string {
  const d = (day ?? '').toUpperCase()
  return WEEKDAYS[d.slice(0, 3)] ?? d
}

/** Lender name of a loan, whichever shape the API used. */
export function loanLender(loan: { lender?: { name: string }; lender_name?: string }): string {
  return loan.lender?.name ?? loan.lender_name ?? ''
}

export function weekLabel(weekStart: string, lang = 'en'): string {
  return formatDate(weekStart, lang)
}
