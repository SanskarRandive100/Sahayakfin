import { useTranslation } from 'react-i18next'
import type { Insurance } from '../api/types'
import { formatINR } from '../lib/format'
import Card from './Card'
import Chip from './Chip'
import { useToast } from './Toast'

export default function InsuranceCard({ item }: { item: Insurance }) {
  const { t } = useTranslation()
  const toast = useToast()
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-sm">{item.name}</div>
          <div className="text-xs text-muted">{item.provider}</div>
        </div>
        {item.is_govt_scheme ? <Chip variant="green">{t('insurance.govt')}</Chip> : <Chip variant="grey">{t('insurance.demo')}</Chip>}
      </div>
      <div className="flex items-center justify-between mt-3 text-sm">
        <div>
          <div>{formatINR(item.premium_paise)} / {t(`insurance.${item.premium_period}`)}</div>
          <div className="text-xs text-muted">{t('insurance.cover', { amount: formatINR(item.cover_paise) })}</div>
        </div>
        <button
          onClick={() => toast.show(t('insurance.added'), 'success')}
          className="h-11 px-4 rounded-xl border border-brand text-brand font-semibold text-sm"
        >
          {t('insurance.add')}
        </button>
      </div>
    </Card>
  )
}
