import { Check, Info, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Offer } from '../api/types'
import { formatINR, weekdayKey } from '../lib/format'

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-3 text-sm">
      <div className="text-ink-2">{label}</div>
      <div className="text-right">{children}</div>
    </div>
  )
}

export default function KfsCard({ offer, weekday }: { offer: Offer; weekday: string }) {
  const { t } = useTranslation()
  const k = offer.kfs
  const day = t(`weekday.${weekdayKey(weekday)}`)
  return (
    <div className="solid rounded-btn px-4 divide-y divide-line">
      <div className="py-4">
        <div className="text-sm text-ink-2">{t('screen.kfs.receive')}</div>
        <div className="font-display text-[40px] leading-tight text-ink mt-1">{formatINR(k.net_disbursed_paise)}</div>
      </div>
      <Row label={t('screen.kfs.payEvery', { day })}>
        {t('screen.kfs.payLine', { amount: formatINR(k.instalment_paise), weeks: k.n_instalments })}
      </Row>
      <Row label={t('screen.kfs.total')}><b>{formatINR(k.total_repayable_paise)}</b></Row>
      <Row label={t('screen.kfs.cost')}>{formatINR(k.total_cost_paise)}</Row>
      <Row
        label={
          <span className="inline-flex items-center gap-1">
            {t('screen.kfs.apr')}
            <span title={t('screen.kfs.aprInfo')} aria-label={t('screen.kfs.aprInfo')}>
              <Info className="w-4 h-4" />
            </span>
          </span>
        }
      >
        {k.advertised_rate_pct}% → <b>{k.apr_pct}%</b>
      </Row>
      <Row label={t('screen.kfs.late')}>
        <span className="text-xs">
          {t('screen.kfs.lateNote', { fee: formatINR(k.late_fee_paise), days: k.cooling_off_days })}
        </span>
      </Row>
      <Row label={t('screen.kfs.fits')}>
        {offer.fits_safe_instalment
          ? <Check className="w-5 h-5 text-strong inline" />
          : <X className="w-5 h-5 text-fair inline" />}
      </Row>
    </div>
  )
}
