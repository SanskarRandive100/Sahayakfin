import { useTranslation } from 'react-i18next'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Applicant, Band } from '../api/types'
import { bandColor } from '../lib/band'
import Caption from './Caption'

const BANDS: Band[] = ['BUILDING', 'FAIR', 'GOOD', 'STRONG']

export default function BandDistribution({ rows }: { rows: Applicant[] }) {
  const { t } = useTranslation()
  const data = BANDS.map((b) => ({ band: b, label: t(`band.${b}`), n: rows.filter((r) => r.band === b).length }))
  return (
    <div>
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} width={28} />
            <Tooltip />
            <Bar dataKey="n" radius={[4, 4, 0, 0]}>{data.map((d) => <Cell key={d.band} fill={bandColor[d.band]} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Caption>{t('chart.bands.caption')}</Caption>
    </div>
  )
}
