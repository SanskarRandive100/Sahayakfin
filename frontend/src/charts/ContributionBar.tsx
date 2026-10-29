import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import type { ScoreResult } from '../api/types'
import Caption from './Caption'

const KEYS = ['income_stability', 'savings_habit', 'bill_discipline', 'expense_health'] as const
const SHADES = ['#0F766E', '#0F766Ebf', '#0F766E80', '#0F766E4d']

export default function ContributionBar({ components }: { components: ScoreResult['components'] }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const totalW = KEYS.filter((k) => components[k].available).reduce((s, k) => s + components[k].weight, 0) || 1
  const parts = KEYS.map((k, i) => {
    const c = components[k]
    return {
      k, shade: SHADES[i], available: c.available,
      pts: c.available ? (c.value * c.weight) / totalW : 0,
      max: c.available ? (100 * c.weight) / totalW : 0,
    }
  })
  const earned = parts.reduce((s, p) => s + p.pts, 0)
  return (
    <div>
      <div className="flex h-8 w-full rounded-lg overflow-hidden bg-slate-200" role="img"
        aria-label={t('chart.contribution.aria', { score: Math.round(earned) })}>
        {parts.map((p) => p.available && (
          <motion.div key={p.k} initial={{ width: reduce ? `${p.pts}%` : 0 }} animate={{ width: `${p.pts}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} style={{ background: p.shade }}
            title={`${t(`component.${p.k}.label`)}: ${Math.round(p.pts)}/${Math.round(p.max)}`} />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm">
        {parts.map((p) => (
          <div key={p.k} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm flex-shrink-0"
              style={p.available ? { background: p.shade } : { border: '1.5px dashed #64748B' }} />
            <span className="truncate">{t(`component.${p.k}.label`)}</span>
            <span className="ml-auto font-semibold whitespace-nowrap">
              {p.available ? `${Math.round(p.pts)}/${Math.round(p.max)}` : t('chart.contribution.notCounted')}
            </span>
          </div>
        ))}
      </div>
      <Caption>{t('chart.contribution.caption', { points: Math.round(100 - earned) })}</Caption>
    </div>
  )
}
