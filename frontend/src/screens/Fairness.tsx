import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, X } from 'lucide-react'
import ErrorBanner from '../components/ErrorBanner'
import LanguageSwitch from '../components/LanguageSwitch'
import Skeleton from '../components/Skeleton'
import { api } from '../api/endpoints'
import type { FairnessReport } from '../api/types'
import { bandColor } from '../lib/band'
import { errText } from '../lib/errors'
import { formatINR } from '../lib/format'

export default function Fairness() {
  const { t } = useTranslation()
  const [data, setData] = useState<FairnessReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setError(null)
    api.getFairness().then(setData).catch((e) => setError(errText(t, e)))
  }
  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sunita = data?.personas.find((p) => p.name === 'Sunita')
  const arjun = data?.personas.find((p) => p.name === 'Arjun')

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold">{t('screen.fairness.title')}</h1>
          <LanguageSwitch />
        </div>
        {error && <ErrorBanner onRetry={load}>{error}</ErrorBanner>}
        {!data && !error && <Skeleton className="h-40 w-full" />}
        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {data.personas.map((p) => (
                <div key={p.name} className="bg-white rounded-card border border-line p-4">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-muted">{t('screen.fairness.income', { amount: formatINR(p.monthly_income_paise) })}</div>
                  <div className="text-4xl font-bold mt-2" style={{ color: bandColor[p.band] }}>{p.score}</div>
                  <div className="text-sm font-semibold" style={{ color: bandColor[p.band] }}>{t(`band.${p.band}`)}</div>
                  <div className="text-xs text-muted mt-1">{t(`confidence.${p.confidence.toLowerCase()}`, { weeks: 12 })}</div>
                </div>
              ))}
            </div>

            {sunita && arjun && (
              <div className="bg-white rounded-card border-2 border-brand p-5">
                <div className="grid grid-cols-2 gap-4 text-center">
                  {[sunita, arjun].map((p) => (
                    <div key={p.name}>
                      <div className="text-sm text-muted">{p.name} · {formatINR(p.monthly_income_paise)}</div>
                      <div className="text-6xl font-bold" style={{ color: bandColor[p.band] }}>{p.score}</div>
                    </div>
                  ))}
                </div>
                <p className="text-center font-medium mt-3">{t('screen.fairness.highlight')}</p>
              </div>
            )}

            <div className="bg-white rounded-card border border-line divide-y divide-line">
              {data.tests.map((x) => (
                <div key={x.code} className="flex items-start gap-3 p-4">
                  <span className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center ${x.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {x.passed ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </span>
                  <div>
                    <div className="font-medium text-sm">{t(`fairness.${x.code}`, { defaultValue: x.code })}</div>
                    <div className="text-xs text-muted">{x.detail}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted">{t('screen.fairness.neverUsed')}</p>
          </>
        )}
      </div>
    </div>
  )
}
