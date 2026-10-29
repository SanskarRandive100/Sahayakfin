import { useTranslation } from 'react-i18next'
import type { KFS } from '../api/types'
import { formatINR } from '../lib/format'

export default function KfsCostBar({ kfs }: { kfs: KFS }) {
  const { t } = useTranslation()
  const total = kfs.total_repayable_paise || 1
  const interest = Math.max(0, kfs.total_cost_paise - kfs.fee_paise)
  const seg = [
    { k: 'receive', v: kfs.net_disbursed_paise, c: '#0F766E' },
    { k: 'fee', v: kfs.fee_paise, c: '#BF8700' },
    { k: 'interest', v: interest, c: '#64748B' },
  ]
  return (
    <div className="mt-3">
      <div className="flex h-4 rounded-full overflow-hidden" role="img" aria-label={t('chart.kfs.aria', { total: formatINR(total) })}>
        {seg.map((s) => <div key={s.k} style={{ width: `${(s.v / total) * 100}%`, background: s.c }} />)}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs mt-1.5">
        {seg.map((s) => (
          <span key={s.k}>
            <b className="inline-block w-2.5 h-2.5 rounded-sm mr-1" style={{ background: s.c }} />
            {t(`chart.kfs.${s.k}`, { amount: formatINR(s.v) })}
          </span>
        ))}
      </div>
      <div className="text-xs text-ink-2 mt-1">{t('chart.kfs.apr', { shown: kfs.advertised_rate_pct, apr: kfs.apr_pct })}</div>
    </div>
  )
}
