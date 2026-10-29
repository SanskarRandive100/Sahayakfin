import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, ResponsiveContainer, XAxis } from 'recharts'
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
import { formatDate, formatINR } from '../lib/format'

const MAX_CATS = 5

export default function Money() {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const [data, setData] = useState<Wellness | null>(null)
  const [goal, setGoal] = useState<Goal | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')

  function load() {
    setError(null)
    api.getWellness(4).then(setData).catch((e) => setError(errText(t, e)))
    api.getGoals().then((g) => setGoal(g[0] ?? null)).catch(() => setGoal(null))
  }
  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps

  const weeks = data?.weeks ?? []
  const totals: Record<string, number> = {}
  weeks.forEach((w) => Object.entries(w.by_category).forEach(([c, v]) => { totals[c] = (totals[c] ?? 0) + v }))
  const top = Object.keys(totals).sort((a, b) => totals[b] - totals[a]).slice(0, MAX_CATS)
  const chart = weeks.map((w) => {
    const row: Record<string, number | string> = { week: formatDate(w.week_start, i18n.language), OTHER_GROUP: 0 }
    Object.entries(w.by_category).forEach(([c, v]) => {
      if (top.includes(c)) row[c] = v / 100
      else row.OTHER_GROUP = (row.OTHER_GROUP as number) + v / 100
    })
    return row
  })
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
    if (!name.trim() || paise <= 0) return
    try { setGoal(await api.createGoal(name.trim(), paise)); toast.show(t('screen.money.goalSaved'), 'success') }
    catch (e) { toast.show(errText(t, e), 'error') }
  }

  return (
    <div className="flex flex-col min-h-[844px]">
      <TopBar title={t('screen.money.title')} />
      <div className="p-4 space-y-4 flex-1">
        {error && <ErrorBanner onRetry={load}>{error}</ErrorBanner>}
        {!data && !error && <Skeleton className="h-48 w-full" />}
        {data && weeks.length === 0 && <p className="text-center text-muted py-10">{t('screen.money.empty')}</p>}
        {data && weeks.length > 0 && (
          <>
            <Card>
              <div className="text-sm font-medium mb-2">{t('screen.money.spending')}</div>
              <div style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart}>
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    {top.map((c) => <Bar key={c} dataKey={c} stackId="a" fill={categoryStyle[c as Category]?.color ?? '#6b7280'} />)}
                    <Bar dataKey="OTHER_GROUP" stackId="a" fill="#9ca3af" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {top.map((c) => {
                  const s = categoryStyle[c as Category] ?? categoryStyle.OTHER
                  const Icon = s.icon
                  return (
                    <span key={c} className="flex items-center gap-1 text-xs" style={{ color: s.color }}>
                      <Icon className="w-3.5 h-3.5" /> {t(s.key)}
                    </span>
                  )
                })}
              </div>
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
                  <Button onClick={createGoal}>{t('screen.money.createGoal')}</Button>
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
                {n.code === 'PAYDAY_SAVE' && (
                  <button onClick={() => toast.show(t('screen.money.moved'), 'success')}
                    className="mt-2 h-10 px-3 rounded-lg bg-brand text-white text-sm font-semibold">
                    {t('screen.money.moveToGoal', { amount: formatINR(Number(n.params.suggest_paise ?? 0)) })}
                  </button>
                )}
              </Card>
            ))}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
