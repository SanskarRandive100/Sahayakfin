import { useTranslation } from 'react-i18next'
import type { TxnOut } from '../api/types'
import { categoryStyle } from '../lib/categories'
import { formatDate, formatINR } from '../lib/format'
import Chip from './Chip'

export default function TxnRow({ txn, onTap }: { txn: TxnOut; onTap?: (t: TxnOut) => void }) {
  const { t, i18n } = useTranslation()
  const s = categoryStyle[txn.category] ?? categoryStyle.OTHER
  const Icon = s.icon
  const credit = txn.direction === 'CR'
  return (
    <button type="button" onClick={() => onTap?.(txn)} className="flex w-full items-center gap-3 py-2.5 text-left min-h-[56px]">
      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: s.bg, color: s.color }}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{txn.narration_masked}</div>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <span>{formatDate(txn.date, i18n.language)}</span>
          {txn.flags.includes('ROUND_TRIP') && <Chip variant="grey">{t('screen.review.notCounted')}</Chip>}
          {txn.flags.includes('BOUNCE') && <Chip variant="amber">{t('screen.review.bounced')}</Chip>}
          {txn.user_corrected && <Chip variant="brand">{t('screen.review.edited')}</Chip>}
        </div>
      </div>
      <div className={`text-sm font-semibold ${credit ? 'text-strong' : 'text-ink'}`}>
        {credit ? '+' : '−'}{formatINR(txn.amount_paise)}
      </div>
    </button>
  )
}
