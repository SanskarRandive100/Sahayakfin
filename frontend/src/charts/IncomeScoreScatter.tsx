import { useTranslation } from 'react-i18next'
import { CartesianGrid, LabelList, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts'
import type { Band, FairnessReport } from '../api/types'
import { bandColor } from '../lib/band'
import { formatINR } from '../lib/format'
import Caption, { Empty } from './Caption'

export default function IncomeScoreScatter({ personas }: { personas: FairnessReport['personas'] }) {
  const { t } = useTranslation()
  if (personas.length === 0) return <Empty text={t('chart.empty')} />
  const data = personas.map((p) => ({ x: p.monthly_income_paise / 100, y: p.score, name: p.name, band: p.band }))
  return (
    <div>
      <div style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 28, left: 4, bottom: 24 }}>
            <CartesianGrid stroke="#E7E4DF" />
            <XAxis type="number" dataKey="x" name="income" tick={{ fontSize: 12, fill: '#5F6470' }}
              tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
              label={{ value: t('chart.scatter.x'), position: 'insideBottom', offset: -12, fontSize: 12, fill: '#5F6470' }} />
            <YAxis type="number" dataKey="y" domain={[0, 100]} tick={{ fontSize: 12, fill: '#5F6470' }} width={36}
              label={{ value: t('chart.scatter.y'), angle: -90, position: 'insideLeft', fontSize: 12, fill: '#5F6470' }} />
            <ZAxis range={[160, 160]} />
            <Tooltip formatter={(v: number, n) => (n === 'income' ? formatINR(v * 100) : v)} />
            <Scatter data={data}
              shape={(p: { cx?: number; cy?: number; payload?: { band: Band } }) => (
                <circle cx={p.cx} cy={p.cy} r={10} fill={bandColor[p.payload?.band ?? 'BUILDING']} stroke="#fff" strokeWidth={2} />
              )}>
              <LabelList dataKey="name" position="top" style={{ fontSize: 12, fill: '#1A1D23', fontWeight: 600 }} />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <Caption>{t('chart.scatter.caption')}</Caption>
    </div>
  )
}
