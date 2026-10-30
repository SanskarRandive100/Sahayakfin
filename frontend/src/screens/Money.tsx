import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import CashFlowChart from '../charts/CashFlowChart'
import BottomNav from '../components/BottomNav'
import Button from '../components/Button'
import Card from '../components/Card'
import ErrorBanner from '../components/ErrorBanner'
import Skeleton from '../components/Skeleton'
import TopBar from '../components/TopBar'
import { useToast } from '../components/Toast'
import { api } from '../api/endpoints'
import type { Category, Goal, Wellness } from '../api/types'
import { categoryStyle } from '../lib/categories'
import { errText } from '../lib/errors'
import { formatINR } from '../lib/format'

const MAX_CATS = 6

export default function Money() {
  const { t } = useTranslation()
  const toast = useToast()
  const [data, setData] = useState<Wellness | null>(null)
  const [goal, setGoal] = useState<Goal | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState(4)
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [saving, setSaving] = useState(false)

  function load() {
    setError(null)
    api.getWellness(range).then(setData).catch((e) => setError(errText(t, e)))
    api.getGoals().then((g) => setGoal(g[0] ?? null)).catch(() => setGoal(null))
  }
  useEffect(load, [range]) // eslint-disable-line react-hooks/exhaustive-deps

  const weeks = data?.weeks ?? []
  const totals: Record<string, number> = {}
  weeks.forEach((w) => Object.entries(w.by_category).forEach(([c, v]) => { totals[c] = (totals[c] ?? 0) + v }))
  const top = Object.keys(totals).sort((a, b) => totals[b] - totals[a]).slice(0, MAX_CATS)
  const last = weeks[weeks.length - 1]
  const compare = last
    ? top.map((c) => {
        const avg = data!.avg4_by_category[c] ?? 0
        const cur = last.by_category[c] ?? 0
        return { c, pct: avg > 0 ? Math.round(((cur - avg) / avg) * 100) : 0 }
      })
    : []
  const essential = last ? Math.round(last.expense_paise * 2) : 0

  async function createGoal() {
    const paise = Number(target.replace(/\D/g, '')) * 100
    if (!name.trim() || paise < 500 || paise > 10000000 || saving) return
    setSaving(true)
    try { setGoal(await api.createGoal(name.trim(), paise)); toast.show(t('screen.money.goalSaved'), 'success') }
    catch (e) { toast.show(errText(t, e), 'error') }
    finally { setSaving(false) }
  }

  return (
    <div className="flex flex-col min-h-screen pb-16 md:pb-0">
      <TopBar title={t('screen.money.title')} />
      <div className="p-4 space-y-4 flex-1">
        {error && <ErrorBanner onRetry={load}>{error}</ErrorBanner>}
        {!data && !error && <Skeleton className="h-48 w-full" />}
        {data && weeks.length === 0 && <p className="text-center text-muted py-10">{t('screen.money.empty')}</p>}
        {data && weeks.length > 0 && (
          <>
            <Card>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">{t("screen.money.spending")}</div>
                <div className="inline-flex rounded-lg border border-line p-0.5" role="group">
                  {[4, 12].map((n) => (
                    <button key={n} onClick={() => setRange(n)} aria-pressed={range === n}
                      className={`h-11 px-3 rounded-md text-sm font-semibold ${range === n ? "bg-brand text-white" : "text-ink-2"}`}>{n} {t("screen.money.weeksShort")}</button>
                  ))}
                </div>
              </div>
              <CashFlowChart weeks={weeks} />
            </Card>
            <Card>
              <div className="text-sm font-medium mb-1">{t('screen.money.vsUsual')}</div>
              <div className="divide-y divide-line">
                {compare.map(({ c, pct }) => (
                  <div key={c} className="flex justify-between py-2 text-sm">
                    <span>{t(categoryStyle[c as Category]?.key ?? 'category.OTHER')}</span>
                    <span className={pct > 5 ? 'text-amber-700 font-semibold' : pct < -5 ? 'text-strong font-semibold' : 'text-muted'}>
                      {pct > 0 ? '+' : pct < 0 ? '−' : ''}{Math.abs(pct)}%
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              {goal ? (
                <>
                  <div className="font-semibold">{goal.name}</div>
                  <div className="h-2 rounded-full bg-gray-100 my-2 overflow-hidden">
                    <div className="h-full bg-brand" style={{ width: `${Math.min(100, (goal.saved_paise / goal.target_paise) * 100)}%` }} />
                  </div>
                  <div className="text-sm text-muted">
                    {formatINR(goal.saved_paise)} / {formatINR(goal.target_paise)} · {t('screen.money.goalLine', { amount: formatINR(goal.weekly_target_paise), weeks: goal.weeks_left })}
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="font-semibold">{t('screen.money.startGoal')}</div>
                  <div className="text-xs text-muted">{t('screen.money.suggest', { amount: formatINR(essential) })}</div>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('screen.money.goalName')}
                    className="w-full h-12 rounded-xl border border-line px-3" aria-label={t('screen.money.goalName')} />
                  <input value={target} inputMode="numeric" onChange={(e) => setTarget(e.target.value)} placeholder={t('screen.money.goalAmount')}
                    className="w-full h-12 rounded-xl border border-line px-3" aria-label={t('screen.money.goalAmount')} />
                  <Button onClick={createGoal} loading={saving} disabled={!name.trim() || Number(target) < 5 || Number(target) > 100000}>{t('screen.money.createGoal')}</Button>
                </div>
              )}
            </Card>

            {data.nudges.map((n) => (
              <Card key={n.code} className="bg-teal-50 border-teal-200">
                <div className="text-sm">
                  {t(`nudge.${n.code}`, {
                    amount: formatINR(Number(n.params.amount_paise ?? 0)),
                    suggest: formatINR(Number(n.params.suggest_paise ?? 0)),
                    category: t(categoryStyle[n.params.category as Category]?.key ?? 'category.OTHER'),
                    pct: n.params.pct, day: n.params.day,
                    done: n.params.done_weeks, total: n.params.total_weeks,
                  })}
                </div>

              </Card>
            ))}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
