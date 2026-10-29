import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import BottomNav from '../components/BottomNav'
import Card from '../components/Card'
import ErrorBanner from '../components/ErrorBanner'
import ScheduleList from '../components/ScheduleList'
import Skeleton from '../components/Skeleton'
import TopBar from '../components/TopBar'
import { api } from '../api/endpoints'
import type { Loan } from '../api/types'
import { errText } from '../lib/errors'
import { formatDate, formatINR } from '../lib/format'

export default function MyLoan() {
  const { t, i18n } = useTranslation()
  const [loans, setLoans] = useState<Loan[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setError(null)
    api.getLoans().then(setLoans).catch((e) => setError(errText(t, e)))
  }
  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loan = loans?.[0]
  const next = loan?.schedule.find((r) => r.status !== 'PAID')

  return (
    <div className="flex flex-col min-h-[844px]">
      <TopBar title={t('screen.myLoan.title')} />
      <div className="p-4 space-y-4 flex-1">
        {error && <ErrorBanner onRetry={load}>{error}</ErrorBanner>}
        {!loans && !error && <Skeleton className="h-32 w-full" />}
        {loans && !loan && <p className="text-center text-muted py-10">{t('screen.myLoan.none')}</p>}
        {loan && (
          <>
            <Card>
              <div className="text-sm text-muted">{loan.lender_name}</div>
              <div className="text-3xl font-bold mt-1">{formatINR(loan.principal_paise)}</div>
              <div className="flex justify-between mt-3 text-sm">
                <div>
                  <div className="text-muted">{t('screen.myLoan.weekly')}</div>
                  <div className="font-semibold">{formatINR(loan.instalment_paise)}</div>
                </div>
                {next && (
                  <div className="text-right">
                    <div className="text-muted">{t('screen.myLoan.next')}</div>
                    <div className="font-semibold">{formatDate(next.due_date, i18n.language)}</div>
                  </div>
                )}
              </div>
            </Card>
            <ScheduleList rows={loan.schedule} />
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
