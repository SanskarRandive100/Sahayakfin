import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ErrorBanner from '../components/ErrorBanner'
import Chip from '../components/Chip'
import LanguageSwitch from '../components/LanguageSwitch'
import Skeleton from '../components/Skeleton'
import { api } from '../api/endpoints'
import type { Applicant, Band } from '../api/types'
import { bandColor } from '../lib/band'
import { errText } from '../lib/errors'
import { formatINR } from '../lib/format'
import { useSession } from '../state/session'

const BANDS: Band[] = ['BUILDING', 'FAIR', 'GOOD', 'STRONG']

export default function LenderDashboard() {
  const { t } = useTranslation()
  const { token, user } = useSession()
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

  const chip = (e: Applicant['eligible']) =>
    e === 'ELIGIBLE' ? <Chip variant="green">{t('screen.loans.preApproved')}</Chip>
      : e === 'NEEDS_REVIEW' ? <Chip variant="amber">{t('screen.loans.needsReview')}</Chip>
      : <Chip variant="grey">{t('screen.loans.notAvailable')}</Chip>

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-6xl mx-auto p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{user?.display_name ?? 'MFI Alpha'} · {t('screen.lender.title')}</h1>
          <LanguageSwitch />
        </div>
        <div className="rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-sm px-4 py-3">{t('screen.lender.banner')}</div>
        {error && <ErrorBanner onRetry={load}>{error}</ErrorBanner>}

        <div className="bg-white rounded-card border border-line p-4 grid md:grid-cols-4 gap-4 items-end">
          <label className="text-sm">{t('screen.lender.minBand')}
            <select value={minBand} onChange={(e) => apply({ band: e.target.value as Band })} className="mt-1 w-full h-11 rounded-lg border border-line px-2">
              {BANDS.map((b) => <option key={b} value={b}>{t(`band.${b}`)}</option>)}
            </select>
          </label>
          <label className="text-sm">{t('screen.lender.maxAmount')}
            <input type="number" value={maxAmount / 100} onChange={(e) => apply({ amount: Number(e.target.value) * 100 })} className="mt-1 w-full h-11 rounded-lg border border-line px-2" />
          </label>
          <label className="text-sm">{t('screen.lender.minWeeks')}
            <input type="number" value={minWeeks} onChange={(e) => apply({ weeks: Number(e.target.value) })} className="mt-1 w-full h-11 rounded-lg border border-line px-2" />
          </label>
          <div className="text-sm">
            {delta && <span className="text-lg font-semibold text-brand fade-in" key={`${delta.before}-${delta.after}`}>
              {t('screen.lender.eligible', { before: delta.before, after: delta.after })}
            </span>}
          </div>
        </div>

        <div className="bg-white rounded-card border border-line overflow-x-auto">
          {!rows && !error && <Skeleton className="h-40 w-full" />}
          {rows && (
            <table className="w-full text-sm">
              <thead className="text-left text-muted border-b border-line">
                <tr>{['ref', 'score', 'confidence', 'reasons', 'safe', 'requested', 'status'].map((k) => <th key={k} className="p-3 font-medium">{t(`screen.lender.col.${k}`)}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.applicant_ref}>
                    <td className="p-3 font-mono">{r.applicant_ref}</td>
                    <td className="p-3"><span className="font-bold mr-2" style={{ color: bandColor[r.band] }}>{r.score}</span><span style={{ color: bandColor[r.band] }}>{t(`band.${r.band}`)}</span></td>
                    <td className="p-3">{t(`screen.lender.conf.${r.confidence}`)}</td>
                    <td className="p-3 text-xs">{r.reasons.map((c) => t(`reason.${c}`, { weeks: '', of: '', late: '' })).join(' · ')}</td>
                    <td className="p-3">{formatINR(r.safe_weekly_paise)}</td>
                    <td className="p-3">{formatINR(r.requested_paise)}</td>
                    <td className="p-3">{chip(r.eligible)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
