import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { WeeklyPoint } from '../api/types'
import { formatDate, formatINR } from '../lib/format'
import Caption, { Empty } from './Caption'

export default function SteadinessChart({
  weekly, medianPaise, p25Paise,
}: { weekly?: WeeklyPoint[]; medianPaise: number; p25Paise: number }) {
  const { t, i18n } = useTranslation()
  if (!weekly || weekly.length === 0) return <Empty text={t('chart.empty')} />
  const data = weekly.map((w) => ({ label: w.week_start ? formatDate(w.week_start, i18n.language) : '', v: w.income_paise / 100 }))
  const pct = medianPaise > 0 ? Math.round((p25Paise / medianPaise) * 100) : 0
  return (
    <div>
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} width={44}
              tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
            <Tooltip formatter={(v: number) => formatINR(v * 100)} />
            <ReferenceLine y={medianPaise / 100} stroke="#334155" strokeDasharray="4 4" />
            <ReferenceLine y={p25Paise / 100} stroke="#BF8700" strokeDasharray="4 4" />
            <Bar dataKey="v" fill="#0F766E" fillOpacity={0.7} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-4 text-xs text-muted mt-1">
        <span>- - {t('chart.steady.normal', { amount: formatINR(medianPaise) })}</span>
        <span className="text-fair">- - {t('chart.steady.bad', { amount: formatINR(p25Paise) })}</span>
      </div>
      <Caption>{t('chart.steady.caption', { pct })}</Caption>
    </div>
  )
}
