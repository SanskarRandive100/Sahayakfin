import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '../components/Button'
import ErrorBanner from '../components/ErrorBanner'
import Skeleton from '../components/Skeleton'
import TopBar from '../components/TopBar'
import WeekCard from '../components/WeekCard'
import BottomNav from '../components/BottomNav'
import { api } from '../api/endpoints'
import type { Category, TxnOut, WeekGroup } from '../api/types'
import CategorySheet from '../components/CategorySheet'
import { useToast } from '../components/Toast'
import { useSession } from '../state/session'
import { errText } from '../lib/errors'

export default function Review() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [weeks, setWeeks] = useState<WeekGroup[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<TxnOut | null>(null)
  const toast = useToast()
  const { latestScore, setLatestScore } = useSession()

  async function pick(c: Category) {
    if (!editing) return
    const id = editing.id
    setEditing(null)
    try {
      const r = await api.patchTxn(id, c)
      setWeeks((ws) => ws && ws.map((w) => ({ ...w, txns: w.txns.map((x) => (x.id === id ? r.txn : x)) })))
      toast.show(t('screen.review.updated', { before: latestScore?.score ?? '–', after: r.score.score ?? '–' }), 'success')
      setLatestScore(r.score)
    } catch (e) { toast.show(errText(t, e), 'error') }
  }

  function load() {
    setError(null)
    api.getTransactions(52).then((r) => setWeeks(r.weeks)).catch((e) => setError(errText(t, e)))
  }
  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col min-h-screen pb-16 md:pb-0">
      <TopBar title={t('screen.review.title')} />
      <div className="p-4 space-y-3 flex-1">
        <p className="text-sm text-muted">{t('screen.review.subtitle')}</p>
        {error && <ErrorBanner onRetry={load}>{error}</ErrorBanner>}
        {!weeks && !error && [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        {weeks?.map((w, i) => <WeekCard key={w.week_start} week={w} defaultOpen={i === 0} onTap={setEditing} />)}
        <Button onClick={() => navigate('/score')}>{t('screen.review.seeScore')}</Button>
      </div>
      <BottomNav />
      <CategorySheet txn={editing} onClose={() => setEditing(null)} onPick={pick} />
    </div>
  )
}
