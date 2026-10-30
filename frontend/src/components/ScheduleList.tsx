import { useTranslation } from 'react-i18next'
import type { Repayment } from '../api/types'
import { formatDate, formatINR } from '../lib/format'
import Chip from './Chip'

const variant = { UPCOMING: 'grey', DUE: 'amber', PAID: 'green', OVERDUE: 'red' } as const

export default function ScheduleList({ rows, onPay, payingId }: { rows: Repayment[]; onPay?: (r: Repayment) => void; payingId?: string | null }) {
  const { t, i18n } = useTranslation()
  const nextId = rows.find((r) => r.status !== 'PAID')?.id
  return (
    <ul className="divide-y divide-line bg-white rounded-card border border-line">
      {rows.map((r) => (
        <li key={r.id} className="px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
          <span>{formatDate(r.due_date, i18n.language)}</span>
          <span className="font-medium">{formatINR(r.amount_paise)}</span>
          <Chip variant={variant[r.status]}>{t(`screen.myLoan.${r.status}`)}</Chip>
        </div>
          {onPay && r.id === nextId && (
            <button onClick={() => onPay(r)} disabled={payingId === r.id}
              className="mt-2 w-full h-11 rounded-btn bg-brand text-white font-semibold disabled:opacity-60">
              {t('screen.myLoan.payNow', { amount: formatINR(r.amount_paise) })}
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
