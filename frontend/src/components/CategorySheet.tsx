import { useTranslation } from 'react-i18next'
import type { Category, TxnOut } from '../api/types'
import { categoryStyle } from '../lib/categories'
import Sheet from './Sheet'

const INCOME: Category[] = ['PLATFORM_PAYOUT', 'CUSTOMER_RECEIPT', 'CASH_DEPOSIT', 'OTHER_INCOME', 'SELF_TRANSFER']
const EXPENSE: Category[] = [
  'FUEL', 'FOOD', 'RENT', 'BILLS', 'PHONE', 'TRANSPORT', 'FAMILY', 'HEALTH', 'EDUCATION',
  'SHOPPING', 'CASH_WITHDRAWAL', 'EMI', 'SAVINGS', 'FEES_CHARGES', 'SELF_TRANSFER', 'OTHER',
]

export default function CategorySheet({
  txn, onClose, onPick,
}: { txn: TxnOut | null; onClose: () => void; onPick: (c: Category) => void }) {
  const { t } = useTranslation()
  const set = txn?.direction === 'CR' ? INCOME : EXPENSE
  return (
    <Sheet open={!!txn} onClose={onClose} title={t('screen.review.pickCategory')}>
      <div className="grid grid-cols-3 gap-2">
        {set.map((c) => {
          const s = categoryStyle[c]
          const Icon = s.icon
          const active = txn?.category === c
          return (
            <button
              key={c}
              onClick={() => onPick(c)}
              className={`flex flex-col items-center gap-1 rounded-xl border p-2 min-h-[72px] ${active ? 'border-brand bg-teal-50' : 'border-line'}`}
            >
              <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: s.bg, color: s.color }}>
                <Icon className="w-5 h-5" />
              </span>
              <span className="text-xs text-center leading-tight">{t(s.key)}</span>
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}
