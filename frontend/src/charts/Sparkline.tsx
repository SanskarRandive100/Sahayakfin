import { Line, LineChart } from 'recharts'
import type { WeeklyPoint } from '../api/types'

/** Tiny weekly-income line for card headers: no axes, no dots. */
export default function Sparkline({ weekly }: { weekly: WeeklyPoint[] }) {
  return (
    <div aria-hidden className="flex-shrink-0">
      <LineChart width={112} height={32} data={weekly} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
        <Line dataKey="income_paise" stroke="#0E7C70" strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </div>
  )
}
