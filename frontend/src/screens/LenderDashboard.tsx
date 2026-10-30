import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, LogOut, Search, ShieldCheck, X } from 'lucide-react'
import BandDistribution from '../charts/BandDistribution'
import ErrorBanner from '../components/ErrorBanner'
import Chip from '../components/Chip'
import LanguageSwitch from '../components/LanguageSwitch'
import Skeleton from '../components/Skeleton'
import { useToast } from '../components/Toast'
import { NumberTicker } from '../site/ui'
import { api } from '../api/endpoints'
import type { Applicant, Band } from '../api/types'
import { bandColor } from '../lib/band'
import { errText } from '../lib/errors'
import { formatINR } from '../lib/format'
import { useSession } from '../state/session'

const BANDS: Band[] = ['BUILDING', 'FAIR', 'GOOD', 'STRONG']
type Filter = 'all' | 'eligible' | 'review' | 'not'
type Decision = 'APPROVED' | 'INFO' | 'DECLINED'
const DEC_CHIP: Record<Decision, { variant: 'green' | 'amber' | 'grey'; key: string }> = {
  APPROVED: { variant: 'green', key: 'decApproved' },
  INFO: { variant: 'amber', key: 'decInfo' },
  DECLINED: { variant: 'grey', key: 'decDeclined' },
}

const isEligible = (e: Applicant['eligible']) => e === true || e === 'ELIGIBLE'
const status = (e: Applicant['eligible']): Exclude<Filter, 'all'> =>
  isEligible(e) ? 'eligible' : e === 'NEEDS_REVIEW' ? 'review' : 'not'

function loadDecisions(key: string): Record<string, Decision> {
  try { return JSON.parse(localStorage.getItem(key) || '{}') } catch { return {} }
}

export default function LenderDashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const { token, user, logout } = useSession()
  const [rows, setRows] = useState<Applicant[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [minBand, setMinBand] = useState<Band>('FAIR')
  const [maxAmount, setMaxAmount] = useState(1500000)
  const [minWeeks, setMinWeeks] = useState(8)
  const [delta, setDelta] = useState<{ before: number; after: number } | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<'score' | 'safe'>('score')
  const [open, setOpen] = useState<Applicant | null>(null)
  const decKey = `lender_decisions_${user?.id ?? 'default'}`
  const [decisions, setDecisions] = useState<Record<string, Decision>>(() => loadDecisions(decKey))

  function load() {
    setError(null)
    api.getApplicants().then(setRows).catch((e) => setError(errText(t, e)))
  }
  useEffect(() => { if (token) load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setDecisions(loadDecisions(decKey)) }, [decKey])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function apply(next: { band?: Band; amount?: number; weeks?: number }) {
    const band = next.band ?? minBand
    const amount = next.amount ?? maxAmount
    const weeks = next.weeks ?? minWeeks
    setMinBand(band); setMaxAmount(amount); setMinWeeks(weeks)
    try {
      const r = await api.putRules({ min_band: band, max_amount_paise: amount, min_weeks: weeks })
      setDelta({ before: r.eligible_before, after: r.eligible_after })
      load()
    } catch (e) { setError(errText(t, e)) }
  }

  function decide(ref: string, d: Decision) {
    const next = { ...decisions, [ref]: d }
    setDecisions(next)
    try { localStorage.setItem(decKey, JSON.stringify(next)) } catch { /* storage unavailable */ }
    const msg = d === 'APPROVED' ? 'approved' : d === 'INFO' ? 'infoRequested' : 'declined'
    toast.show(t(`lenderV12.${msg}`, { ref }), d === 'DECLINED' ? 'info' : 'success')
    setOpen(null)
  }

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (rows ?? [])
      .filter((r) => !q || r.applicant_ref.toLowerCase().includes(q))
      .filter((r) => filter === 'all' || status(r.eligible) === filter)
      .sort((a, b) => sort === 'score' ? b.score - a.score : b.safe_weekly_paise - a.safe_weekly_paise)
  }, [rows, query, filter, sort])

  if (!token) return <Navigate to="/lender/login" replace />

  const chip = (e: Applicant['eligible']) =>
    isEligible(e) ? <Chip variant="green">{t('screen.loans.preApproved')}</Chip>
      : e === 'NEEDS_REVIEW' ? <Chip variant="amber">{t('screen.loans.needsReview')}</Chip>
      : <Chip variant="grey">{t('screen.loans.notAvailable')}</Chip>

  const n = rows?.length ?? 0
  const eligible = rows?.filter((r) => isEligible(r.eligible)).length ?? 0
  const avgScore = n ? rows!.reduce((s, r) => s + r.score, 0) / n : 0
  const avgSafe = n ? rows!.reduce((s, r) => s + r.safe_weekly_paise, 0) / n / 100 : 0
  const counts = { APPROVED: 0, INFO: 0, DECLINED: 0 } as Record<Decision, number>
  for (const r of rows ?? []) { const d = decisions[r.applicant_ref]; if (d) counts[d] += 1 }

  const kpis = [
    { k: 'applicants', v: n, d: 0, pre: '' },
    { k: 'eligible', v: eligible, d: 0, pre: '' },
    { k: 'avgScore', v: avgScore, d: 0, pre: '' },
    { k: 'avgSafe', v: avgSafe, d: 0, pre: '₹' },
  ]
  const filters: { k: Filter; label: string }[] = [
    { k: 'all', label: 'filterAll' }, { k: 'eligible', label: 'filterEligible' },
    { k: 'review', label: 'filterReview' }, { k: 'not', label: 'filterNot' },
  ]

  return (
    <div className="min-h-screen bg-bg md:flex">
      <aside className="md:w-[240px] flex-shrink-0 bg-brand-900 text-white md:min-h-screen p-4 flex md:flex-col items-center md:items-stretch gap-4">
        <div className="text-lg font-bold px-2">Sahayak<span className="text-brand-100">Fin</span> <span className="text-xs font-normal text-white/60">{t('screen.lender.portal')}</span></div>
        <div className="flex items-center gap-2 h-11 px-3 rounded-xl bg-brand text-sm font-medium"><LayoutDashboard className="w-5 h-5" />{t('screen.lender.applicantsNav')}</div>
        <button onClick={() => { logout(); navigate('/') }} aria-label={t('screen.lender.logout')}
          className="ml-auto md:ml-0 md:mt-auto flex items-center gap-2 h-11 px-3 rounded-xl text-sm text-white/80 hover:bg-white/10">
          <LogOut className="w-5 h-5" /><span className="hidden md:inline">{t('screen.lender.logout')}</span>
        </button>
      </aside>
      <main className="flex-1 min-w-0 p-4 md:p-8 space-y-6 max-w-[1200px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[26px] md:text-[32px] font-bold">{user?.display_name ?? 'MFI Alpha'} · {t('screen.lender.title')}</h1>
          <div className="flex items-center gap-2">
            <LanguageSwitch />
            <button onClick={() => { logout(); navigate('/') }}
              className="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-line bg-white text-sm hover:bg-gray-50">
              <LogOut className="w-4 h-4" />{t('screen.lender.logout')}
            </button>
          </div>
        </div>
        <div className="rounded-xl bg-brand-50 border border-brand-100 text-brand-900 text-sm px-4 py-3">{t('screen.lender.banner')}</div>
        {error && <ErrorBanner onRetry={load}>{error}</ErrorBanner>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <div key={k.k} className="bg-white rounded-card border border-line shadow-card p-4">
              <div className="text-sm text-muted">{t(`screen.lender.kpi.${k.k}`)}</div>
              <div className="text-3xl font-bold mt-1">{k.pre}<NumberTicker key={k.v} value={k.v} decimals={k.d} /></div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 bg-white rounded-card border border-line shadow-card p-5">
            <h2 className="text-lg font-semibold mb-2">{t('chart.bands.title')}</h2>
            {rows ? <BandDistribution rows={rows} /> : <Skeleton className="h-44 w-full" />}
          </div>
          <div className="lg:col-span-2 bg-white rounded-card border border-line shadow-card p-5 space-y-3">
            <h2 className="text-lg font-semibold">{t('screen.lender.rules')}</h2>
            <label className="text-sm block">{t('screen.lender.minBand')}
              <select value={minBand} onChange={(e) => apply({ band: e.target.value as Band })} className="mt-1 w-full h-11 rounded-lg border border-line px-2 bg-white">
                {BANDS.map((b) => <option key={b} value={b}>{t(`band.${b}`)}</option>)}
              </select>
            </label>
            <label className="text-sm block">{t('screen.lender.maxAmount')}
              <input type="number" value={maxAmount / 100} onChange={(e) => apply({ amount: Number(e.target.value) * 100 })} className="mt-1 w-full h-11 rounded-lg border border-line px-2" />
            </label>
            <label className="text-sm block">{t('screen.lender.minWeeks')}
              <input type="number" value={minWeeks} onChange={(e) => apply({ weeks: Number(e.target.value) })} className="mt-1 w-full h-11 rounded-lg border border-line px-2" />
            </label>
            {delta && (
              <div key={`${delta.before}-${delta.after}`} className="text-lg font-semibold text-brand fade-in">
                {t('screen.lender.eligible', { before: delta.before, after: delta.after })}
              </div>
            )}
          </div>
        </div>

        {n > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">{t('lenderV12.decisions')}:</span>
            {(Object.keys(DEC_CHIP) as Decision[]).map((d) => (
              <Chip key={d} variant={DEC_CHIP[d].variant}>{t(`lenderV12.${DEC_CHIP[d].key}`)} · {counts[d]}</Chip>
            ))}
          </div>
        )}

        <div className="bg-white rounded-card border border-line shadow-card">
          {rows && n > 0 && (
            <div className="flex flex-wrap items-center gap-3 p-4 border-b border-line">
              <label className="relative">
                <span className="sr-only">{t('lenderV12.search')}</span>
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('lenderV12.search')}
                  className="h-10 pl-9 pr-3 rounded-lg border border-line w-[200px]" />
              </label>
              <div className="flex flex-wrap gap-1.5" role="group">
                {filters.map((f) => (
                  <button key={f.k} onClick={() => setFilter(f.k)} aria-pressed={filter === f.k}
                    className={`h-9 px-3 rounded-full text-sm border ${filter === f.k ? 'bg-brand text-white border-brand' : 'bg-white border-line hover:bg-gray-50'}`}>
                    {t(`lenderV12.${f.label}`)}
                  </button>
                ))}
              </div>
              <label className="text-sm flex items-center gap-2 ml-auto">{t('lenderV12.sortBy')}
                <select value={sort} onChange={(e) => setSort(e.target.value as 'score' | 'safe')} className="h-10 rounded-lg border border-line px-2 bg-white">
                  <option value="score">{t('lenderV12.sortScore')}</option>
                  <option value="safe">{t('lenderV12.sortSafe')}</option>
                </select>
              </label>
            </div>
          )}
          <div className="overflow-x-auto">
            {!rows && !error && <Skeleton className="h-40 w-full" />}
            {rows && n === 0 && <div className="p-8 text-center text-muted">{t('lenderV12.empty')}</div>}
            {rows && n > 0 && shown.length === 0 && <div className="p-8 text-center text-muted">{t('lenderV12.noMatch')}</div>}
            {shown.length > 0 && (
              <table className="w-full text-sm">
                <thead className="text-left text-muted border-b border-line">
                  <tr>
                    {['ref', 'score', 'confidence', 'reasons', 'safe', 'requested', 'status'].map((k) => <th key={k} className="p-3 font-medium whitespace-nowrap">{t(`screen.lender.col.${k}`)}</th>)}
                    <th className="p-3 font-medium whitespace-nowrap">{t('lenderV12.decision')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {shown.map((r) => {
                    const d = decisions[r.applicant_ref]
                    return (
                      <tr key={r.applicant_ref} onClick={() => setOpen(r)} tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(r) } }}
                        aria-label={`${t('lenderV12.open')} ${r.applicant_ref}`}
                        className="cursor-pointer hover:bg-brand-50/50 focus:outline-none focus:bg-brand-50">
                        <td className="p-3 font-mono">{r.applicant_ref}</td>
                        <td className="p-3 whitespace-nowrap"><span className="font-bold mr-2" style={{ color: bandColor[r.band] }}>{r.score}</span><span style={{ color: bandColor[r.band] }}>{t(`band.${r.band}`)}</span></td>
                        <td className="p-3">{t(`screen.lender.conf.${r.confidence}`)}</td>
                        <td className="p-3 text-xs min-w-[200px]">{r.reasons.map((c) => t(`reasonShort.${c}`, { defaultValue: c })).join(' · ')}</td>
                        <td className="p-3">{formatINR(r.safe_weekly_paise)}</td>
                        <td className="p-3">{formatINR(r.requested_paise)}</td>
                        <td className="p-3">{chip(r.eligible)}</td>
                        <td className="p-3">{d ? <Chip variant={DEC_CHIP[d].variant}>{t(`lenderV12.${DEC_CHIP[d].key}`)}</Chip> : <span className="text-muted">—</span>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {open && (
        <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="applicant-title">
          <div className="absolute inset-0 bg-black/40 fade-in" onClick={() => setOpen(null)} />
          <div className="relative w-full max-w-[420px] h-full bg-white shadow-xl p-5 overflow-y-auto fade-in space-y-4">
            <div className="flex items-center justify-between">
              <h2 id="applicant-title" className="text-lg font-semibold">{t('lenderV12.drawerTitle', { ref: open.applicant_ref })}</h2>
              <button onClick={() => setOpen(null)} aria-label={t('lenderV12.close')} className="w-9 h-9 grid place-items-center rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex items-end gap-3">
              <div className="text-5xl font-bold" style={{ color: bandColor[open.band] }}>{open.score}</div>
              <div className="pb-1">
                <div className="font-semibold" style={{ color: bandColor[open.band] }}>{t(`band.${open.band}`)}</div>
                <div className="text-sm text-muted">{t('lenderV12.confidence')}: {t(`screen.lender.conf.${open.confidence}`)}</div>
              </div>
              <div className="ml-auto pb-1">{chip(open.eligible)}</div>
            </div>
            <div>
              <div className="text-sm font-semibold mb-1">{t('lenderV12.reasons')}</div>
              <ul className="list-disc pl-5 text-sm space-y-1">
                {open.reasons.map((c) => <li key={c}>{t(`reason.${c}`, { defaultValue: t(`reasonShort.${c}`, { defaultValue: c }) })}</li>)}
              </ul>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-bg p-3"><dt className="text-muted">{t('lenderV12.safeWeekly')}</dt><dd className="font-semibold text-base">{formatINR(open.safe_weekly_paise)}</dd></div>
              <div className="rounded-lg bg-bg p-3"><dt className="text-muted">{t('lenderV12.requested')}</dt><dd className="font-semibold text-base">{formatINR(open.requested_paise)}</dd></div>
              <div className="rounded-lg bg-bg p-3 col-span-2"><dt className="text-muted">{t('lenderV12.maxSafe')}</dt><dd className="font-semibold text-base">≈ {formatINR(open.safe_weekly_paise * 26)} <span className="text-xs font-normal text-muted">({t('lenderV12.approx')})</span></dd></div>
            </dl>
            <div className="flex items-start gap-2 rounded-lg bg-brand-50 border border-brand-100 text-brand-900 text-sm p-3">
              <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />{t('lenderV12.privacy')}
            </div>
            <div className="grid gap-2">
              <button onClick={() => decide(open.applicant_ref, 'APPROVED')} className="h-11 rounded-xl bg-brand text-white font-medium hover:opacity-90">{t('lenderV12.approve')}</button>
              <button onClick={() => decide(open.applicant_ref, 'INFO')} className="h-11 rounded-xl border border-amber-400 text-amber-800 bg-amber-50 font-medium hover:bg-amber-100">{t('lenderV12.askInfo')}</button>
              <button onClick={() => decide(open.applicant_ref, 'DECLINED')} className="h-11 rounded-xl border border-line text-gray-700 font-medium hover:bg-gray-50">{t('lenderV12.decline')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
