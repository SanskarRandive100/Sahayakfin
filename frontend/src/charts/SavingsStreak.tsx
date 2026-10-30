import { useTranslation } from 'react-i18next'
import type { WeeklyPoint } from '../api/types'
import { formatDate } from '../lib/format'
import Caption, { Empty } from './Caption'

export default function SavingsStreak({ weekly }: { weekly?: WeeklyPoint[] }) {
  const { t, i18n } = useTranslation()
  if (!weekly || weekly.length === 0) return <Empty text={t('chart.empty')} />
  const saved = weekly.filter((w) => w.saved).length
  const cap = t('chart.streak.caption', { saved, total: weekly.length })
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="img" aria-label={cap}>
        {weekly.map((w, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className={`w-5 h-5 rounded-full border-2 border-brand ${w.saved ? 'bg-brand' : 'bg-transparent'} ${i === weekly.length - 1 ? 'ring-2 ring-brand-100 ring-offset-1' : ''}`} />
            <span className="text-[10px] text-muted">{w.week_start ? formatDate(w.week_start, i18n.language) : ''}</span>
          </div>
        ))}
      </div>
      <Caption>{cap}</Caption>
    </div>
  )
}
