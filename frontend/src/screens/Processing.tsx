import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import StageList from '../components/StageList'
import TopBar from '../components/TopBar'
import Button from '../components/Button'
import type { StatementResult } from '../api/types'
import { useSession } from '../state/session'

export default function Processing() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { state } = useLocation()
  const { setLatestScore } = useSession()
  const result = (state as { result?: StatementResult } | null)?.result
  const [done, setDone] = useState(0)

  useEffect(() => {
    if (!result) return
    setLatestScore(result.score)
    const timers: number[] = []
    for (let i = 1; i <= 4; i++) timers.push(window.setTimeout(() => setDone(i), i * 500))
    timers.push(window.setTimeout(() => navigate('/review', { replace: true }), 4 * 500 + 1000))
    return () => timers.forEach(clearTimeout)
  }, [result, navigate, setLatestScore])

  if (!result) return <Navigate to="/connect" replace />

  const ms = Object.fromEntries(result.stages.map((s) => [s.code, s.ms]))
  return (
    <div>
      <TopBar title="" />
      <div className="p-4 space-y-4">
        <StageList doneCount={done} msByCode={ms} />
        {done >= 4 && (
          <p className="text-center text-sm font-medium text-strong fade-in">
            {t('screen.processing.done', { count: result.txn_count, weeks: result.weeks_covered })}
          </p>
        )}
        {result.warnings.length > 0 && (
          <Button variant="secondary" onClick={() => navigate('/connect')}>{t('common.retry')}</Button>
        )}
      </div>
    </div>
  )
}
