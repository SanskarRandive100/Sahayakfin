import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BottomNav from '../components/BottomNav'
import Button from '../components/Button'
import Chip from '../components/Chip'
import ComponentBar from '../components/ComponentBar'
import ErrorBanner from '../components/ErrorBanner'
import ReasonCard from '../components/ReasonCard'
import ScoreGauge from '../components/ScoreGauge'
import Skeleton from '../components/Skeleton'
import TipCard from '../components/TipCard'
import ReadAloudButton from '../components/ReadAloudButton'
import TopBar from '../components/TopBar'
import { useToast } from '../components/Toast'
import { api } from '../api/endpoints'
import type { ScoreResult } from '../api/types'
import { errText } from '../lib/errors'
import { useSession } from '../state/session'

const COMPONENTS = ['income_stability', 'savings_habit', 'bill_discipline', 'expense_health'] as const

export default function Score() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const { latestScore, setLatestScore } = useSession()
  const [score, setScore] = useState<ScoreResult | null>(latestScore)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setError(null)
    api.getLatestScore().then((s) => { setScore(s); setLatestScore(s) }).catch((e) => setError(errText(t, e)))
  }
  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function tryTip(code: string) {
    try {
      const r = await api.whatIf(code)
      toast.show(t('screen.score.ifYouDo', { before: r.score_before, after: r.score_after }), 'success')
    } catch (e) { toast.show(errText(t, e), 'error') }
  }

  const conf = score
    ? t(`confidence.${score.confidence.toLowerCase()}`, { weeks: score.weeks_observed })
    : ''

  return (
    <div className="flex flex-col min-h-[844px]">
      <TopBar title={t('screen.score.title')} />
      <div className="p-4 space-y-4 flex-1">
        {error && <ErrorBanner onRetry={load}>{error}</ErrorBanner>}
        {!score && !error && <Skeleton className="h-48 w-full" />}
        {score && score.score !== null && (
          <>
            <ScoreGauge score={score.score} band={score.band} />
            <div className="flex justify-center">
              <ReadAloudButton text={t('screen.score.speak', {
                score: score.score, band: t(`band.${score.band}`),
                reason: score.reasons[0] ? t(`reason.${score.reasons[0].code}`, score.reasons[0].params) : '',
                tip: score.tips[0] ? t(`tip.${score.tips[0].code}`, { points: score.tips[0].points, ...(score.tips[0].params ?? {}) }) : '',
              })} />
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Chip variant="brand">{conf}</Chip>
              {score.provisional && <Chip variant="amber">{t('confidence.provisional')}</Chip>}
              {score.consent_revoked && <Chip variant="grey">{t('confidence.revoked')}</Chip>}
            </div>

            <section>
              <h2 className="text-lg font-semibold mb-1">{t('screen.score.builds')}</h2>
              <div className="bg-white rounded-card border border-line px-4 py-2">
                {COMPONENTS.map((k) => <ComponentBar key={k} name={k} c={score.components[k]} />)}
              </div>
            </section>

            {score.reasons.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-lg font-semibold">{t('screen.score.whyNot')}</h2>
                {score.reasons.slice(0, 2).map((r) => <ReasonCard key={r.code} reason={r} />)}
              </section>
            )}

            {score.tips.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-lg font-semibold">{t('screen.score.improve')}</h2>
                {score.tips.map((tip) => <TipCard key={tip.code} tip={tip} onTap={() => tryTip(tip.code)} />)}
              </section>
            )}

            <p className="text-xs text-muted">{t('screen.score.footer')}</p>
            <Button onClick={() => navigate('/loans')}>{t('screen.score.seeLoans')}</Button>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
