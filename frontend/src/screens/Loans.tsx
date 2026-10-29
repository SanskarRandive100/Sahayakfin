import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BottomNav from '../components/BottomNav'
import Card from '../components/Card'
import Chip from '../components/Chip'
import ConfirmSheet from '../components/ConfirmSheet'
import ErrorBanner from '../components/ErrorBanner'
import OfferCard from '../components/OfferCard'
import InsuranceCard from '../components/InsuranceCard'
import Skeleton from '../components/Skeleton'
import TopBar from '../components/TopBar'
import { api } from '../api/endpoints'
import type { Offer, OffersResponse } from '../api/types'
import { errText } from '../lib/errors'
import { formatINR } from '../lib/format'

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

  function load() {
    setError(null); setData(null)
    api.getOffers(requested).then(setData).catch((e) => setError(errText(t, e)))
  }
  useEffect(load, [requested]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api.getAffordability().then((a) => setWeekday(a.payout_weekday)).catch(() => undefined) }, [])

  async function accept() {
    if (!pick) return
    setAccepting(true)
    try {
      await api.acceptOffer(pick.id, pick.amount_paise, pick.weeks)
      navigate('/loan')
    } catch (e) { setError(errText(t, e)); setPick(null) } finally { setAccepting(false) }
  }

  return (
    <div className="flex flex-col min-h-[844px]">
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
            {data.loans.map((o) => (
              <OfferCard key={o.id} offer={o} weekday={weekday} onChoose={() => setPick(o)} />
            ))}
            {data.insurance.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-lg font-semibold">{t('insurance.title')}</h2>
                {data.insurance.map((i) => <InsuranceCard key={i.id} item={i} />)}
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
          day: t(`weekday.${weekday}`),
          weeks: pick.weeks,
          total: formatINR(pick.kfs.total_repayable_paise),
        }) : ''}
      />
    </div>
  )
}
