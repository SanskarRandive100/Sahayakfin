import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { WeekGroup } from '../api/types'
import { formatDate, formatINR } from '../lib/format'
import Card from './Card'
import TxnRow from './TxnRow'

export default function WeekCard({ week, defaultOpen = false }: { week: WeekGroup; defaultOpen?: boolean }) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card className="p-0 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
      >
        <div className="flex-1">
          <div className="text-sm font-semibold">
            {t('screen.review.week', { date: formatDate(week.week_start, i18n.language) })}
          </div>
          <div className="text-xs text-muted">
            {t('screen.review.in', { amount: formatINR(week.income_paise) })} · {t('screen.review.out', { amount: formatINR(week.expense_paise) })}
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-2 divide-y divide-line border-t border-line">
          {week.txns.map((tx) => <TxnRow key={tx.id} txn={tx} />)}
        </div>
      )}
    </Card>
  )
}
