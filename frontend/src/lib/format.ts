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

export function weekLabel(weekStart: string, lang = 'en'): string {
  return formatDate(weekStart, lang)
}
