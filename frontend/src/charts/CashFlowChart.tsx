import { useTranslation } from 'react-i18next'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Category, Wellness } from '../api/types'
import { categoryStyle } from '../lib/categories'
import { formatDate, formatINR } from '../lib/format'
import Caption, { Empty } from './Caption'

const PALETTE: Record<string, string> = {
  FUEL: '#E76F51', FOOD: '#F4A261', RENT: '#2A9D8F', BILLS: '#264653', PHONE: '#8AB17D', TRANSPORT: '#E9C46A',
  FAMILY: '#9C6ADE', HEALTH: '#EF476F', EDUCATION: '#118AB2', CASH_WITHDRAWAL: '#6C757D', FEES_CHARGES: '#B5838D',
}
const OTHER = '#94A3B8'
const MAX = 6

export default function CashFlowChart({ weeks }: { weeks: Wellness['weeks'] }) {
  const { t, i18n } = useTranslation()
  if (weeks.length === 0) return <Empty text={t('chart.empty')} />
  const totals: Record<string, number> = {}
  weeks.forEach((w) => Object.entries(w.by_category).forEach(([c, v]) => { totals[c] = (totals[c] ?? 0) + v }))
  const top = Object.keys(totals).filter((c) => c !== 'OTHER').sort((a, b) => totals[b] - totals[a]).slice(0, MAX)
  const data = weeks.map((w) => {
    const row: Record<string, number | string> = { label: formatDate(w.week_start, i18n.language), income: w.income_paise / 100, other: 0 }
    Object.entries(w.by_category).forEach(([c, v]) => {
      if (top.includes(c)) row[c] = v / 100
      else row.other = (row.other as number) + v / 100
    })
    return row
  })
  return (
    <div>
      <div style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} width={44}
              tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
            <Tooltip formatter={(v: number) => formatINR(v * 100)} />
            {top.map((c) => (
              <Bar key={c} dataKey={c} stackId="a" fill={PALETTE[c] ?? OTHER}
                name={t(categoryStyle[c as Category]?.key ?? 'category.OTHER')} />
            ))}
            <Bar dataKey="other" stackId="a" fill={OTHER} name={t('category.OTHER')} />
            <Line dataKey="income" stroke="#0F172A" strokeWidth={2} dot={{ r: 3 }} name={t('chart.cash.income')} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {top.map((c) => {
          const s = categoryStyle[c as Category] ?? categoryStyle.OTHER
          const Icon = s.icon
          return (
            <span key={c} className="flex items-center gap-1 text-xs text-ink-2">
              <Icon className="w-3.5 h-3.5" style={{ color: PALETTE[c] ?? OTHER }} />{t(s.key)}
            </span>
          )
        })}
      </div>
      <Caption>{t('chart.cash.caption')}</Caption>
    </div>
  )
}
