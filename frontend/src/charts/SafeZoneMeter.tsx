import { useTranslation } from 'react-i18next'
import { formatINR } from '../lib/format'
import Caption from './Caption'

export default function SafeZoneMeter({
  safePaise, capPaise, requestedPaise,
}: { safePaise: number; capPaise: number; requestedPaise: number }) {
  const { t } = useTranslation()
  const cap = Math.max(capPaise, safePaise)
  const max = Math.max(cap * 1.25, requestedPaise * 1.1, 1)
  const pct = (v: number) => Math.min(100, (v / max) * 100)
  return (
    <div>
      <div className="relative h-4 rounded-full overflow-hidden flex bg-risk/70" role="img"
        aria-label={t('chart.safe.caption', { amount: formatINR(safePaise) })}>
        <div style={{ width: `${pct(safePaise)}%` }} className="bg-strong" />
        <div style={{ width: `${pct(cap) - pct(safePaise)}%` }} className="bg-fair" />
      </div>
      <div className="relative h-10">
        <div className="absolute top-0 -translate-x-1/2 flex flex-col items-center" style={{ left: `${pct(requestedPaise)}%` }}>
          <span className="w-0 h-0 border-x-4 border-x-transparent border-b-[6px] border-b-ink" />
          <span className="text-xs font-semibold whitespace-nowrap">{formatINR(requestedPaise)}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-ink-2">
        <span><b className="inline-block w-2.5 h-2.5 rounded-sm bg-strong mr-1" />{t('chart.safe.safe')}</span>
        <span><b className="inline-block w-2.5 h-2.5 rounded-sm bg-fair mr-1" />{t('chart.safe.stretch')}</span>
        <span><b className="inline-block w-2.5 h-2.5 rounded-sm bg-risk mr-1" />{t('chart.safe.risky')}</span>
      </div>
      <Caption>{t('chart.safe.caption', { amount: formatINR(safePaise) })}</Caption>
    </div>
  )
}
