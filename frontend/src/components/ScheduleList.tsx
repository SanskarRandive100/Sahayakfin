import { useTranslation } from 'react-i18next'
import type { Repayment } from '../api/types'
import { formatDate, formatINR } from '../lib/format'
import Chip from './Chip'

const variant = { UPCOMING: 'grey', DUE: 'amber', PAID: 'green', OVERDUE: 'red' } as const

export default function ScheduleList({ rows }: { rows: Repayment[] }) {
  const { t, i18n } = useTranslation()
  return (
    <ul className="divide-y divide-line bg-white rounded-card border border-line">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center justify-between px-4 py-3 text-sm">
          <span>{formatDate(r.due_date, i18n.language)}</span>
          <span className="font-medium">{formatINR(r.amount_paise)}</span>
          <Chip variant={variant[r.status]}>{t(`screen.myLoan.${r.status}`)}</Chip>
        </li>
      ))}
    </ul>
  )
}
