import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '../components/Toast'
import { tipText } from '../components/TipCard'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BottomNav from '../components/BottomNav'
import Card from '../components/Card'
import Chip from '../components/Chip'
import ConfirmSheet from '../components/ConfirmSheet'
import ErrorBanner from '../components/ErrorBanner'
import OfferCard from '../components/OfferCard'
import InsuranceCard from '../components/InsuranceCard'
import SafeZoneMeter from '../charts/SafeZoneMeter'
import Skeleton from '../components/Skeleton'
import TopBar from '../components/TopBar'
import { api } from '../api/endpoints'
import type { Offer, OffersResponse, ScoreResult } from '../api/types'
import { errText } from '../lib/errors'
import { formatINR, weekdayKey } from '../lib/format'

const quick = [500000, 1000000, 1500000]

export default function Loans() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [requested, setRequested] = useState(1000000)
  const [data, setData] = useState<OffersResponse | null>(null)
  const [weekday, setWeekday] = useState('FRIDAY')
  const [error, setError] = useState<string | null>(null)
  const [pick, setPick] = useState<Offer | null>(null)
  const [accepting, setAccepting] = useState(false)
  const requestVersion = useRef(0)
  const toast = useToast()
  const [score, setScore] = useState<ScoreResult | null>(null)
  const [surplus, setSurplus] = useState(0)

  const load = useCallback(() => {
    const version = ++requestVersion.current
    setError(null); setData(null)
    setPick(null)
    if (requested <= 0 || requested > 10000000) {
      setError(t('error.VALIDATION_ERROR'))
      return
    }
    api.getOffers(requested).then((result) => {
      if (version === requestVersion.current) setData(result)
    }).catch((e) => {
      if (version === requestVersion.current) setError(errText(t, e))
    })
  }, [requested, t])
  useEffect(() => {
    ++requestVersion.current
    setData(null); setError(null); setPick(null)
    if (requested <= 0 || requested > 10000000) {
      setError(t('error.VALIDATION_ERROR'))
      return
    }
    const timer = window.setTimeout(load, 250)
    return () => { window.clearTimeout(timer); ++requestVersion.current }
  }, [load, requested])
  useEffect(() => {
    api.getAffordability().then((a) => { setWeekday(a.payout_weekday); setSurplus(a.median_weekly_surplus_paise ?? 0) }).catch(() => undefined)
    api.getLatestScore().then(setScore).catch(() => undefined)
  }, [])

  async function accept() {
    if (!pick) return
    setAccepting(true)
    try {
      await api.acceptOffer(pick.id, pick.amount_paise, pick.weeks)
      navigate('/loan')
    } catch (e) { setError(errText(t, e)); setPick(null) } finally { setAccepting(false) }
  }

  return (
    <div className="flex flex-col min-h-screen pb-16 md:pb-0">
      <TopBar title={t('screen.loans.title')} />
      <div className="p-4 space-y-4 flex-1">
        <Card>
          <div className="text-sm font-medium mb-2">{t('screen.loans.need')}</div>
          <input
            inputMode="numeric"
            value={requested / 100}
            onChange={(e) => setRequested(Math.max(0, Number(e.target.value.replace(/\D/g, '')) * 100))}
            className="w-full h-[52px] rounded-xl border border-line px-4 text-xl font-semibold"
            aria-label={t('screen.loans.need')}
          />
          <div className="flex gap-2 mt-3">
            {quick.map((q) => (
              <button key={q} onClick={() => setRequested(q)}>
                <Chip variant={q === requested ? 'brand' : 'default'} className="px-3 py-2 text-sm">{formatINR(q)}</Chip>
              </button>
            ))}
          </div>
        </Card>

        {error && <ErrorBanner onRetry={load}>{error}</ErrorBanner>}
        {!data && !error && <Skeleton className="h-40 w-full" />}

        {data && (
          <>
            <div className="rounded-card bg-green-50 border border-green-200 p-4">
              <div className="font-semibold text-green-800">
                {t('screen.loans.safe', { amount: formatINR(data.safe_amount_paise) })}
              </div>
              <div className="text-xs text-green-800/80 mt-1">
                {data.safe_amount_paise < data.requested_paise
                  ? t('screen.loans.suggest', { asked: formatINR(data.requested_paise), safe: formatINR(data.safe_amount_paise) })
                  : t('screen.loans.safeNote')}
              </div>
            </div>
            <Card>
              <SafeZoneMeter safePaise={data.safe_amount_paise} capPaise={stretchLimit(data)} requestedPaise={data.requested_paise} />
            </Card>
            {data.requested_paise > data.safe_amount_paise && (
              <WhyNot data={data} score={score} surplus={surplus} />
            )}
            <h2 className="text-lg font-semibold">{t('loansV11.preApprovedTitle')}</h2>
            <div className="grid gap-4 lg:grid-cols-2">
            {data.loans.map((o) => (
              <OfferCard key={o.id} offer={o} weekday={weekday} onChoose={() => setPick(o)} />
            ))}
            </div>
            {(data.stretch?.length ?? 0) > 0 && (
              <section className="space-y-2">
                <h2 className="text-lg font-semibold">{t('loansV11.stretchTitle')}</h2>
                <div className="grid gap-4 lg:grid-cols-2">
                  {data.stretch!.map((s) => {
                    const amber = s.risk.light !== 'RED'
                    return (
                      <Card key={`${s.product_id}-${s.weeks}`}>
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">{s.lender.name}</div>
                          <Chip variant="default" className="text-xs">{t('loansV11.needsApproval')}</Chip>
                        </div>
                        <div className="text-sm mt-2">{t('kfs.receive')}: <b>{formatINR(s.kfs.net_disbursed_paise)}</b></div>
                        <div className="text-sm">{t('kfs.payLine', { amount: formatINR(s.kfs.instalment_paise), weeks: s.weeks })}</div>
                        <div className="text-sm">{t('kfs.total')}: <b>{formatINR(s.kfs.total_repayable_paise)}</b> · APR {s.kfs.apr_pct}%</div>
                        <div className={`mt-3 rounded-xl p-3 text-sm ${amber ? 'bg-amber-50 border border-amber-200 text-amber-900' : 'bg-red-50 border border-red-200 text-red-900'}`}>
                          <div className="font-semibold mb-1">{t('loansV11.risksTitle')}</div>
                          <ul className="list-disc pl-5 space-y-0.5">
                            {s.risk.weekly_over_safe_paise > 0 && <li>{t('loansV11.riskOver', { amount: formatINR(s.risk.weekly_over_safe_paise) })}</li>}
                            <li>{t('loansV11.riskWeeks', { n: s.risk.weeks_covered, of: s.risk.weeks_total })}</li>
                            <li>{t('loansV11.riskLate', { fee: formatINR(s.kfs.late_fee_paise || 5000) })}</li>
                          </ul>
                        </div>
                        <button className="mt-3 w-full h-11 rounded-xl border border-line font-semibold"
                          onClick={() => toast.show(t('loansV11.requestSent', { lender: s.lender.name }), 'success')}>
                          {t('loansV11.requestApproval')}
                        </button>
                      </Card>
                    )
                  })}
                </div>
              </section>
            )}
            {data.insurance.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-lg font-semibold">{t('insurance.title')}</h2>
                <div className="grid gap-3 md:grid-cols-3">{data.insurance.map((i) => <InsuranceCard key={i.id} item={i} />)}</div>
              </section>
            )}
          </>
        )}
      </div>
      <BottomNav />
      <ConfirmSheet
        open={!!pick}
        onClose={() => setPick(null)}
        onConfirm={accept}
        loading={accepting}
        title={t('screen.loans.confirmTitle')}
        body={pick ? t('screen.loans.confirmBody', {
          weekly: formatINR(pick.kfs.instalment_paise),
          day: t(`weekday.${weekdayKey(weekday)}`),
          weeks: pick.weeks,
          total: formatINR(pick.kfs.total_repayable_paise),
        }) : ''}
      />
    </div>
  )
}

/** The amber "stretch" zone's upper edge: the larger of the request and the 52-week safe amount, within RBI's cap. */
function stretchLimit(d: OffersResponse): number {
  const cap = d.rbi_cap_amount_paise ?? d.safe_amount_paise
  const top = Math.max(d.requested_paise, d.safe_amount_52_paise ?? 0, ...(d.stretch ?? []).map((s) => s.amount_paise))
  return Math.max(d.safe_amount_paise, Math.min(cap, Math.round(top * 1.2 / 10000) * 10000))
}

function WhyNot({ data, score, surplus }: { data: OffersResponse; score: ScoreResult | null; surplus: number }) {
  const { t } = useTranslation()
  const asked = formatINR(data.requested_paise)
  const s26 = data.stretch?.find((s) => s.weeks === 26)
  const safeWeekly = data.safe_weekly_paise ?? 0
  const gap = Math.max(0, data.requested_paise - data.safe_amount_paise)
  const saveWeekly = Math.max(2000, Math.round((0.1 * Math.max(0, surplus)) / 1000) * 1000)
  const saveWeeks = Math.ceil(gap / saveWeekly)
  const reason = score && score.band !== 'STRONG' ? score.reasons?.[0] : undefined
  const tip = score?.tips?.[0]
  const longer = data.safe_amount_52_paise ?? 0
  return (
    <div className="rounded-card border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 space-y-2">
      <div className="font-semibold">{t('loansV11.whyNot', { amount: asked })}</div>
      <ul className="list-disc pl-5 space-y-1">
        {s26 && safeWeekly > 0 && (
          <li>{t('loansV11.whyWeekly', { amount: asked, weekly: formatINR(s26.kfs.instalment_paise), safe: formatINR(safeWeekly) })}</li>
        )}
        {reason && <li>{String(t(`reason.${reason.code}`, (reason.params ?? {}) as Record<string, unknown>))}</li>}
      </ul>
      <div className="font-semibold pt-1">{t('loansV11.howTitle')}</div>
      <ul className="list-disc pl-5 space-y-1">
        {longer > data.safe_amount_paise && (
          <li>{t('loansV11.howLonger', { amount: formatINR(Math.min(longer, data.requested_paise)) })}</li>
        )}
        {gap > 0 && <li>{t('loansV11.howSave', { weekly: formatINR(saveWeekly), weeks: saveWeeks, gap: formatINR(gap) })}</li>}
        {tip && <li>{tipText(t, tip)}</li>}
      </ul>
    </div>
  )
}
