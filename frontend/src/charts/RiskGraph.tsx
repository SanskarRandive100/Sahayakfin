import { useTranslation } from 'react-i18next'
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { StressResult } from '../api/types'
import Chip from '../components/Chip'
import { formatDate, formatINR } from '../lib/format'
import Caption, { Empty } from './Caption'

const SHOCKS = [0, 0.1, 0.2, 0.3]

export default function RiskGraph({
  result, instalmentPaise, shock, onShockChange, loading,
}: {
  result: StressResult | null
  instalmentPaise: number
  shock: number
  onShockChange: (s: number) => void
  loading?: boolean
}) {
  const { t, i18n } = useTranslation()
  const data = (result?.series ?? []).map((p) => ({
    label: p.week_start ? formatDate(p.week_start, i18n.language) : '',
    v: p.stressed_surplus_paise / 100,
    short: p.stressed_surplus_paise < instalmentPaise,
  }))
  const variant = result?.light === 'GREEN' ? 'green' : result?.light === 'AMBER' ? 'amber' : 'red'
  return (
    <div>
      <div className="inline-flex rounded-xl border border-line bg-white p-1 gap-1" role="group" aria-label={t('chart.risk.shock')}>
        {SHOCKS.map((s) => (
          <button key={s} onClick={() => onShockChange(s)} aria-pressed={shock === s}
            className={`h-10 min-w-[56px] px-3 rounded-lg text-sm font-semibold ${shock === s ? 'bg-brand text-white' : 'text-ink-2 hover:bg-slate-50'}`}>
            {s === 0 ? '0%' : `−${Math.round(s * 100)}%`}
          </button>
        ))}
      </div>
      {loading && <div className="text-xs text-muted mt-2">{t('common.loading')}</div>}
      {result && data.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Chip variant={variant}>{t(`light.${result.light}`)}</Chip>
            <span className="text-sm font-medium">{t('stress.covered', { done: result.weeks_covered, total: result.weeks_total })}</span>
          </div>
          <div style={{ height: 190 }} className="mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} width={56}
                  tickFormatter={(v: number) => (v < 0 ? `−₹${Math.abs(v)}` : `₹${v}`)} />
                <Tooltip formatter={(v: number) => formatINR(v * 100)} />
                <ReferenceLine y={instalmentPaise / 100} stroke="#0F172A" strokeDasharray="4 4" />
                <Bar dataKey="v" radius={[4, 4, 0, 0]} animationDuration={400}>
                  {data.map((d, i) => <Cell key={i} fill={d.short ? '#CF222E' : '#1A7F37'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-2 mt-1">
            <span className="inline-block w-5 border-t-2 border-dashed border-ink" aria-hidden />
            {t('chart.risk.yourPayment', { amount: formatINR(instalmentPaise) })}
          </div>
          <div className="text-sm mt-1">{t(`advice.${result.advice}`, { defaultValue: '' })}</div>
        </>
      ) : !loading && <Empty text={t('chart.empty')} />}
      <Caption>{t('chart.risk.caption')}</Caption>
    </div>
  )
}
