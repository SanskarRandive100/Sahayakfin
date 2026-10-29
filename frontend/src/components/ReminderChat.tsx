import { CheckCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Reminder } from '../api/types'
import { formatINR } from '../lib/format'
import { useSession } from '../state/session'

function longDate(iso: string, lang: string) {
  const locale = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN'
  try { return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(iso)) } catch { return iso }
}
function time(iso: string) {
  try { return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

export default function ReminderChat({ items }: { items: Reminder[] }) {
  const { t, i18n } = useTranslation()
  const { user } = useSession()
  const name = (user?.display_name ?? '').split(' ')[0]
  return (
    <div className="rounded-card overflow-hidden border border-line bg-[#efeae2]">
      <div className="flex items-center gap-2 bg-brand text-white px-3 py-2">
        <div className="w-8 h-8 rounded-full bg-green-400 flex items-center justify-center font-bold text-sm">S</div>
        <div className="text-sm font-semibold">{t('reminder.header')}</div>
      </div>
      <div className="p-3 space-y-2 min-h-[80px]">
        {items.length === 0 && <div className="text-xs text-muted text-center py-4">{t('reminder.none')}</div>}
        {items.filter((r) => r.sent).map((r) => (
          <div key={r.id} className="max-w-[88%] bg-white rounded-lg rounded-tl-none px-3 py-2 shadow-sm">
            <div className="text-sm leading-snug">
              {t(`reminder.${r.code}`, {
                name,
                amount: formatINR(r.params.amount_paise),
                lender: r.params.lender,
                date: longDate(r.params.due_date, i18n.language),
              })}
            </div>
            <div className="flex justify-end items-center gap-1 text-[11px] text-muted mt-1">
              {time(r.send_at)} <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
