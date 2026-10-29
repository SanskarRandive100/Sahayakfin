import { useTranslation } from 'react-i18next'
import type { Repayment } from '../api/types'
import { formatINR } from '../lib/format'
import Caption from './Caption'

export default function RepaymentTimeline({ rows }: { rows: Repayment[] }) {
  const { t } = useTranslation()
  const paid = rows.filter((r) => r.status === 'PAID').length
  const left = rows.filter((r) => r.status !== 'PAID').reduce((s, r) => s + r.amount_paise, 0)
  const cap = t('chart.timeline.caption', { paid, total: rows.length, left: formatINR(left) })
  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="img" aria-label={cap}>
        {rows.map((r) => {
          const cls = r.status === 'PAID' ? 'bg-strong border-strong'
            : r.status === 'DUE' ? 'bg-white border-fair'
            : r.status === 'OVERDUE' ? 'bg-white border-risk'
            : 'bg-slate-200 border-slate-200'
          return <span key={r.id} title={`#${r.seq}`} className={`w-4 h-4 rounded-full border-[3px] ${cls}`} />
        })}
      </div>
      <Caption>{cap}</Caption>
    </div>
  )
}
