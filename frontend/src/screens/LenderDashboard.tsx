import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, LogOut } from 'lucide-react'
import BandDistribution from '../charts/BandDistribution'
import ErrorBanner from '../components/ErrorBanner'
import Chip from '../components/Chip'
import LanguageSwitch from '../components/LanguageSwitch'
import Skeleton from '../components/Skeleton'
import { NumberTicker } from '../site/ui'
import { api } from '../api/endpoints'
import type { Applicant, Band } from '../api/types'
import { bandColor } from '../lib/band'
import { errText } from '../lib/errors'
import { formatINR } from '../lib/format'
import { useSession } from '../state/session'

const BANDS: Band[] = ['BUILDING', 'FAIR', 'GOOD', 'STRONG']

export default function LenderDashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { token, user, logout } = useSession()
  const [rows, setRows] = useState<Applicant[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [minBand, setMinBand] = useState<Band>('FAIR')
  const [maxAmount, setMaxAmount] = useState(1500000)
  const [minWeeks, setMinWeeks] = useState(8)
  const [delta, setDelta] = useState<{ before: number; after: number } | null>(null)

  function load() {
    setError(null)
    api.getApplicants().then(setRows).catch((e) => setError(errText(t, e)))
  }
  useEffect(() => { if (token) load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  if (!token) return <Navigate to="/lender/login" replace />

  const isEligible = (e: Applicant['eligible']) => e === true || e === 'ELIGIBLE'
  const chip = (e: Applicant['eligible']) =>
    isEligible(e) ? <Chip variant="green">{t('screen.loans.preApproved')}</Chip>
      : e === 'NEEDS_REVIEW' ? <Chip variant="amber">{t('screen.loans.needsReview')}</Chip>
      : <Chip variant="grey">{t('screen.loans.notAvailable')}</Chip>

  const n = rows?.length ?? 0
  const eligible = rows?.filter((r) => isEligible(r.eligible)).length ?? 0
  const avgScore = n ? rows!.reduce((s, r) => s + r.score, 0) / n : 0
  const avgSafe = n ? rows!.reduce((s, r) => s + r.safe_weekly_paise, 0) / n / 100 : 0

  const kpis = [
    { k: 'applicants', v: n, d: 0, pre: '' },
    { k: 'eligible', v: eligible, d: 0, pre: '' },
    { k: 'avgScore', v: avgScore, d: 0, pre: '' },
    { k: 'avgSafe', v: avgSafe, d: 0, pre: '₹' },
  ]

  return (
    <div className="min-h-screen bg-bg md:flex">
      <aside className="md:w-[240px] flex-shrink-0 bg-brand-900 text-white md:min-h-screen p-4 flex md:flex-col items-center md:items-stretch gap-4">
        <div className="text-lg font-bold px-2">Sahayak<span className="text-brand-100">Fin</span> <span className="text-xs font-normal text-white/60">{t('screen.lender.portal')}</span></div>
        <div className="flex items-center gap-2 h-11 px-3 rounded-xl bg-brand text-sm font-medium"><LayoutDashboard className="w-5 h-5" />{t('screen.lender.applicantsNav')}</div>
        <button onClick={() => { logout(); navigate('/lender/login') }} aria-label={t('screen.lender.logout')}
          className="ml-auto md:ml-0 md:mt-auto flex items-center gap-2 h-11 px-3 rounded-xl text-sm text-white/80 hover:bg-white/10">
          <LogOut className="w-5 h-5" /><span className="hidden md:inline">{t('screen.lender.logout')}</span>
        </button>
      </aside>
      <main className="flex-1 min-w-0 p-4 md:p-8 space-y-6 max-w-[1200px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[26px] md:text-[32px] font-bold">{user?.display_name ?? 'MFI Alpha'} · {t('screen.lender.title')}</h1>
          <LanguageSwitch />
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

        <div className="bg-white rounded-card border border-line shadow-card overflow-x-auto">
          {!rows && !error && <Skeleton className="h-40 w-full" />}
          {rows && (
            <table className="w-full text-sm">
              <thead className="text-left text-muted border-b border-line">
                <tr>{['ref', 'score', 'confidence', 'reasons', 'safe', 'requested', 'status'].map((k) => <th key={k} className="p-3 font-medium whitespace-nowrap">{t(`screen.lender.col.${k}`)}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.applicant_ref}>
                    <td className="p-3 font-mono">{r.applicant_ref}</td>
                    <td className="p-3 whitespace-nowrap"><span className="font-bold mr-2" style={{ color: bandColor[r.band] }}>{r.score}</span><span style={{ color: bandColor[r.band] }}>{t(`band.${r.band}`)}</span></td>
                    <td className="p-3">{t(`screen.lender.conf.${r.confidence}`)}</td>
                    <td className="p-3 text-xs min-w-[200px]">{r.reasons.map((c) => t(`reasonShort.${c}`, { defaultValue: c })).join(' · ')}</td>
                    <td className="p-3">{formatINR(r.safe_weekly_paise)}</td>
                    <td className="p-3">{formatINR(r.requested_paise)}</td>
                    <td className="p-3">{chip(r.eligible)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
