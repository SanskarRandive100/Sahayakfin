import { Lightbulb } from 'lucide-react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import type { Tip } from '../api/types'
import { formatINR } from '../lib/format'

/** Kept for callers that still pass raw tip text; tip texts now carry their own "about +N points". */
export function approximateTipText(text: string): string {
  return text
}

/** One personalised sentence per tip, built from the engine's params, plus "(about +N points)". */
export function tipText(t: TFunction, tip: Tip): string {
  const p = (tip.params ?? {}) as Record<string, unknown>
  const num = (k: string) => (typeof p[k] === 'number' ? (p[k] as number) : undefined)
  const cat = (c: unknown) => String(t(`category.${String(c)}`, { defaultValue: String(c) }))
  let body: string
  switch (tip.code) {
    case 'SAVE_EVERY_WEEK': {
      const amount = formatINR(num('suggest_paise') ?? num('min_amount_paise') ?? 2000)
      const saved = num('saved_weeks')
      const of = num('of')
      if (saved !== undefined && of) {
        body = saved * 12 >= 9 * of
          ? String(t('tip.SAVE_KEEP_GOING', { amount }))
          : String(t('tip.SAVE_EVERY_WEEK_DETAIL', { amount, saved, of }))
      } else body = String(t('tip.SAVE_EVERY_WEEK', { amount }))
      break
    }
    case 'PAY_BILLS_ON_TIME': {
      const late = Array.isArray(p.late) ? (p.late as { category: string; times_late: number }[]) : []
      const bounces = num('bounces') ?? 0
      if (late.length) body = String(t('tip.PAY_BILLS_LATE', { what: cat(late[0].category), times: late[0].times_late }))
      else if (bounces > 0) body = String(t('tip.PAY_BILLS_BOUNCE', { bounces }))
      else body = String(t('tip.PAY_BILLS_ON_TIME'))
      break
    }
    case 'KEEP_SURPLUS_WEEKS': {
      const cut = num('cut_paise')
      body = cut && p.top_flex_category
        ? String(t('tip.KEEP_SURPLUS_CUT', { amount: formatINR(cut), category: cat(p.top_flex_category), weeks: num('deficit_weeks') ?? 0 }))
        : String(t('tip.KEEP_SURPLUS_WEEKS'))
      break
    }
    case 'STEADY_INCOME': {
      const low = num('low_weeks')
      const gap = num('gap_paise')
      body = low && gap
        ? String(t('tip.STEADY_INCOME_DETAIL', { low, gap: formatINR(gap) }))
        : String(t('tip.STEADY_INCOME'))
      break
    }
    default:
      body = String(t(`tip.${tip.code}`, { ...p } as Record<string, unknown>))
  }
  return tip.points > 0 ? `${body} ${t('tip.points', { points: tip.points })}` : body
}

export default function TipCard({ tip, onTap }: { tip: Tip; onTap: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      onClick={onTap}
      className="w-full text-left bg-teal-50 border border-teal-100 rounded-card p-4 flex items-start gap-3 active:bg-teal-100"
    >
      <Lightbulb className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
      <div className="text-sm">{tipText(t, tip)}</div>
    </button>
  )
}
