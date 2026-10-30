import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BottomNav from '../components/BottomNav'
import Button from '../components/Button'
import Card from '../components/Card'
import Chip from '../components/Chip'
import ErrorBanner from '../components/ErrorBanner'
import ReadAloudButton from '../components/ReadAloudButton'
import ReasonCard from '../components/ReasonCard'
import ScoreGauge from '../components/ScoreGauge'
import Skeleton from '../components/Skeleton'
import TipCard, { tipText } from '../components/TipCard'
import TopBar from '../components/TopBar'
import { useToast } from '../components/Toast'
import ContributionBar from '../charts/ContributionBar'
import SavingsStreak from '../charts/SavingsStreak'
import SteadinessChart from '../charts/SteadinessChart'
import BadWeekTest from '../components/BadWeekTest'
import { api } from '../api/endpoints'
import type { Affordability, Loan, Offer, ScoreResult } from '../api/types'
import { errText } from '../lib/errors'
import { formatDate, formatINR, loanLender } from '../lib/format'
import { useSession } from '../state/session'

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const { latestScore, setLatestScore } = useSession()
  const [score, setScore] = useState<ScoreResult | null>(latestScore)
  const [error, setError] = useState<string | null>(null)
  const [loan, setLoan] = useState<Loan | null>(null)
  const [offer, setOffer] = useState<Offer | null>(null)
  const [afford, setAfford] = useState<Affordability | null>(null)

  function load() {
    setError(null)
    api.getLatestScore().then((s) => { setScore(s); setLatestScore(s) }).catch((e) => setError(errText(t, e)))
    api.getLoans().then((l) => setLoan(l[0] ?? null)).catch(() => undefined)
    api.getAffordability().then(setAfford).catch(() => setAfford(null))
    api.getOffers(1000000).then((o) => setOffer(o.loans.find((x) => x.eligible !== 'OUTSIDE') ?? null)).catch(() => undefined)
  }
  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function tryTip(code: string) {
    try {
      const r = await api.whatIf(code)
      toast.show(t('screen.score.ifYouDo', { before: r.score_before, after: r.score_after }), 'success')
    } catch (e) { toast.show(errText(t, e), 'error') }
  }

  const conf = score ? t(`confidence.${score.confidence.toLowerCase()}`, { weeks: score.weeks_observed }) : ''
  const speak = score && score.score !== null
    ? t('screen.score.speak', {
        score: score.score, band: t(`band.${score.band}`),
        reason: score.reasons[0] ? t(`reason.${score.reasons[0].code}`, score.reasons[0].params) : '',
        tip: score.tips[0] ? tipText(t, score.tips[0]) : '',
      })
    : ''
  const next = loan?.schedule.find((r) => r.status !== 'PAID')

  return (
    <div className="flex flex-col min-h-screen pb-20 md:pb-8">
      <TopBar title={t('screen.score.title')} right={<ReadAloudButton text={speak} />} />
      <div className="p-4 md:p-6 space-y-6 flex-1">
        {error && <ErrorBanner onRetry={load}>{error}</ErrorBanner>}
        {!score && !error && <Skeleton className="h-64 w-full" />}
        {score && score.score !== null && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <Card className="lg:col-span-5 flex flex-col items-center p-6">
                <ScoreGauge score={score.score} band={score.band} />
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  <Chip variant="brand">{conf}</Chip>
                  {score.provisional && <Chip variant="amber">{t('confidence.provisional')}</Chip>}
                  {score.consent_revoked && <Chip variant="grey">{t('confidence.revoked')}</Chip>}
                </div>
              </Card>
              <Card className="lg:col-span-7 p-6 space-y-4">
                <h2 className="text-lg font-semibold">{t('screen.score.builds')}</h2>
                <ContributionBar components={score.components} />
                {score.reasons.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {score.reasons.slice(0, 2).map((r) => <ReasonCard key={r.code} reason={r} />)}
                  </div>
                )}
              </Card>
              <Card className="lg:col-span-8 p-6">
                <h2 className="text-lg font-semibold mb-2">{t('chart.steady.title')}</h2>
                <SteadinessChart weekly={score.metrics.weekly} medianPaise={score.metrics.median_weekly_income_paise}
                  p25Paise={score.metrics.p25_weekly_income_paise} />
              </Card>
              <Card className="lg:col-span-4 p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-2">{t('chart.streak.title')}</h2>
                  <SavingsStreak weekly={score.metrics.weekly} />
                </div>
                {score.tips.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold">{t('screen.score.improve')}</h2>
                    {score.tips.map((tip) => <TipCard key={tip.code} tip={tip} onTap={() => tryTip(tip.code)} />)}
                  </div>
                )}
              </Card>
              <Card className="lg:col-span-6 p-6">
                <h2 className="text-lg font-semibold">{t('dashboard.risk')}</h2>
                {offer ? (
                  <BadWeekTest instalmentPaise={offer.kfs.instalment_paise} defaultOpen />
                ) : (
                  <p className="text-sm text-muted mt-2">{t('dashboard.riskEmpty')}</p>
                )}
              </Card>
              <Card className="lg:col-span-6 p-6 flex flex-col gap-4 self-start">
                {next ? (
                  <div>
                    <h2 className="text-lg font-semibold">{t('dashboard.nextPayment')}</h2>
                    <div className="text-3xl font-bold mt-2">{formatINR(next.amount_paise)}</div>
                    <div className="text-sm text-muted">{[formatDate(next.due_date, i18n.language), loan && loanLender(loan)].filter(Boolean).join(' · ')}</div>
                    <Link to="/app/loan" className="text-brand text-sm font-semibold underline mt-2 inline-block">{t('dashboard.viewLoan')}</Link>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-lg font-semibold">{t('dashboard.ready')}</h2>
                    {afford && afford.safe_weekly_paise > 0 && (afford.loan_max_paise['26'] ?? 0) > 0 && (
                      <p className="text-base font-semibold text-brand mt-2">
                        {t('dashboard.safeLine', { amount: formatINR(afford.loan_max_paise['26']), weekly: formatINR(afford.safe_weekly_paise) })}
                      </p>
                    )}
                    <p className="text-sm text-muted mt-1">{t('dashboard.readyNote')}</p>
                  </div>
                )}
                <Button onClick={() => navigate('/app/loans')}>{t('screen.score.seeLoans')}</Button>
              </Card>
            </div>
            <p className="text-xs text-muted">{t('screen.score.footer')}</p>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
