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
  const [data, setData] = useState<Wellness | null>(null)
  const [goal, setGoal] = useState<Goal | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState(4)

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

            <GoalPlanner goal={goal ?? null} setGoal={setGoal} essential={essential} />

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

const STATUS_STYLE: Record<string, string> = {
  ON_TRACK: 'bg-green-50 text-green-800 border-green-200',
  STRETCH: 'bg-amber-50 text-amber-900 border-amber-200',
  NOT_FEASIBLE: 'bg-red-50 text-red-800 border-red-200',
}

function isoInDays(days: number): string {
  const d = new Date(Date.now() + days * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function GoalPlanner({ goal, setGoal, essential }: { goal: Goal | null; setGoal: (g: Goal | null) => void; essential: number }) {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [date, setDate] = useState(isoInDays(84))
  const [already, setAlready] = useState('')
  const [saving, setSaving] = useState(false)
  const [add, setAdd] = useState('')
  const minDate = isoInDays(14)
  const rupees = (v: string) => Number(v.replace(/\D/g, '')) * 100
  const fmtDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString(i18n.language === 'en' ? 'en-IN' : `${i18n.language}-IN`, { day: 'numeric', month: 'short', year: 'numeric' })

  async function create() {
    const paise = rupees(target)
    const saved = rupees(already)
    if (!name.trim() || paise < 500 || paise > 10000000 || saved >= paise || date < minDate || saving) return
    setSaving(true)
    try { setGoal(await api.createGoal(name.trim(), paise, date, saved)); toast.show(t('screen.money.goalSaved'), 'success') }
    catch (e) { toast.show(errText(t, e), 'error') }
    finally { setSaving(false) }
  }

  async function contribute() {
    const paise = rupees(add)
    if (!goal || paise <= 0) return
    setSaving(true)
    try { setGoal(await api.contributeGoal(goal.id, paise)); setAdd(''); toast.show(t('goalV11.recorded'), 'success') }
    catch (e) { toast.show(errText(t, e), 'error') }
    finally { setSaving(false) }
  }

  if (!goal) {
    const paise = rupees(target)
    const valid = !!name.trim() && paise >= 500 && paise <= 10000000 && rupees(already) < paise && date >= minDate
    return (
      <Card>
        <div className="space-y-2">
          <div className="font-semibold">{t('goalV11.planTitle')}</div>
          <div className="text-xs text-muted">{t('screen.money.suggest', { amount: formatINR(essential) })}</div>
          <label className="block text-sm">{t('screen.money.goalName')}
            <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} className="mt-1 w-full h-12 rounded-xl border border-line px-3" />
          </label>
          <label className="block text-sm">{t('screen.money.goalAmount')}
            <input value={target} inputMode="numeric" onChange={(e) => setTarget(e.target.value)} className="mt-1 w-full h-12 rounded-xl border border-line px-3" />
          </label>
          <label className="block text-sm">{t('goalV11.byDate')}
            <input type="date" value={date} min={minDate} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full h-12 rounded-xl border border-line px-3" />
          </label>
          <label className="block text-sm">{t('goalV11.already')}
            <input value={already} inputMode="numeric" onChange={(e) => setAlready(e.target.value)} placeholder="0" className="mt-1 w-full h-12 rounded-xl border border-line px-3" />
          </label>
          {date < minDate && <div className="text-xs text-red-700">{t('goalV11.dateTooSoon')}</div>}
          <Button onClick={create} loading={saving} disabled={!valid}>{t('screen.money.createGoal')}</Button>
        </div>
      </Card>
    )
  }

  const pct = Math.min(100, (goal.saved_paise / goal.target_paise) * 100)
  const weekly = goal.required_weekly_paise ?? goal.weekly_target_paise
  const sugg = goal.suggestions ?? []
  const suggTotal = sugg.reduce((a, x) => a + x.saves_paise, 0)
  const cat = (c: string) => t(categoryStyle[c as Category]?.key ?? 'category.OTHER')
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold">{goal.name}</div>
        {goal.status && (
          <span className={`text-xs font-semibold border rounded-full px-2 py-0.5 ${STATUS_STYLE[goal.status]}`}>{t(`goalV11.status.${goal.status}`)}</span>
        )}
      </div>
      <div className="h-2 rounded-full bg-gray-100 my-2 overflow-hidden" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-sm text-muted">
        {formatINR(goal.saved_paise)} / {formatINR(goal.target_paise)} · {t('screen.money.goalLine', { amount: formatINR(weekly), weeks: goal.weeks_left })}
        {goal.target_date && <> · {t('goalV11.by', { date: fmtDate(goal.target_date) })}</>}
      </div>
      {goal.status === 'NOT_FEASIBLE' && (
        <div className="mt-2 text-sm rounded-xl border border-red-200 bg-red-50 text-red-900 p-3">
          {goal.suggested_date && <div>{t('goalV11.suggestDate', { date: fmtDate(goal.suggested_date) })}</div>}
          {goal.suggested_amount_paise != null && <div>{t('goalV11.suggestAmount', { amount: formatINR(goal.suggested_amount_paise) })}</div>}
        </div>
      )}
      {goal.status === 'STRETCH' && <div className="mt-2 text-sm text-amber-900">{t('goalV11.stretchNote')}</div>}
      {sugg.length > 0 && (
        <div className="mt-3">
          <div className="text-sm font-semibold">{t('goalV11.whereTitle')}</div>
          <ul className="list-disc pl-5 text-sm space-y-0.5 mt-1">
            {sugg.map((x) => (
              <li key={x.category}>
                {t('goalV11.cut', { category: cat(x.category), amount: formatINR(x.saves_paise) })}
                {x.spiked && <> {t('goalV11.spiked', { amount: formatINR(x.this_week_paise) })}</>}
              </li>
            ))}
          </ul>
          <div className="text-xs text-muted mt-1">{t('goalV11.cutTotal', { total: formatINR(suggTotal), need: formatINR(weekly) })}</div>
        </div>
      )}
      <div className="flex gap-2 mt-3">
        <input value={add} inputMode="numeric" onChange={(e) => setAdd(e.target.value)} placeholder={t('goalV11.amountPh')}
          aria-label={t('goalV11.amountPh')} className="flex-1 h-11 rounded-xl border border-line px-3" />
        <Button onClick={contribute} loading={saving} disabled={rupees(add) <= 0}>{t('goalV11.iSaved')}</Button>
      </div>
      <div className="text-xs text-muted mt-2">{t('goalV11.howAdd')}</div>
      <button className="text-xs underline text-ink-2 mt-2" onClick={() => setGoal(null)}>{t('goalV11.newGoal')}</button>
    </Card>
  )
}
