import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../api/endpoints'
import type { FairnessReport } from '../api/types'
import IncomeScoreScatter from '../charts/IncomeScoreScatter'
import ErrorBanner from '../components/ErrorBanner'
import LanguageSwitch from '../components/LanguageSwitch'
import Skeleton from '../components/Skeleton'
import { bandColor } from '../lib/band'
import { errText } from '../lib/errors'
import { formatINR } from '../lib/format'
import { Reveal } from './ui'

export default function FairnessLab() {
  const { t, i18n } = useTranslation()
  const [data, setData] = useState<FairnessReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setError(null)
    api.getFairness().then(setData).catch((e) => setError(errText(t, e)))
  }
  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sunita = data?.personas.find((p) => p.name.split(' ')[0] === 'Sunita')
  const arjun = data?.personas.find((p) => p.name.split(' ')[0] === 'Arjun')

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-brand-900 text-white">
        <div className="max-w-[1200px] mx-auto h-16 px-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold min-h-11 inline-flex items-center">Sahayak<span className="text-brand-100">Fin</span></Link>
          <LanguageSwitch />
        </div>
      </header>
      <div className="max-w-[1200px] mx-auto p-4 md:p-8 space-y-8">
        <h1 className="text-[26px] md:text-[32px] font-bold">{t('screen.fairness.title')}</h1>
        {error && <ErrorBanner onRetry={load}>{error}</ErrorBanner>}
        {!data && !error && <Skeleton className="h-48 w-full" />}
        {data && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {data.personas.map((p, i) => (
                <Reveal key={p.name} delay={i * 0.06} className="bg-white rounded-card border border-line shadow-card p-5">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-muted">{t('screen.fairness.income', { amount: formatINR(p.monthly_income_paise) })}</div>
                  <div className="text-5xl font-bold mt-3" style={{ color: bandColor[p.band] }}>{p.score}</div>
                  <div className="text-sm font-semibold" style={{ color: bandColor[p.band] }}>{t(`band.${p.band}`)}</div>
                  <div className="text-xs text-muted mt-1">{t(`screen.lender.conf.${p.confidence}`)}{p.confidence === 'LOW' && <> · {t('confidence.provisional')}</>}</div>
                </Reveal>
              ))}
            </div>

            <div className="grid lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 bg-white rounded-card border border-line shadow-card p-6">
                <h2 className="text-lg font-semibold mb-2">{t('chart.scatter.title')}</h2>
                <IncomeScoreScatter personas={data.personas} />
              </div>
              {sunita && arjun && (
                <div className="lg:col-span-2 bg-white rounded-card border-2 border-brand p-6 flex flex-col justify-center">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    {[sunita, arjun].map((p) => (
                      <div key={p.name}>
                        <div className="text-sm text-muted">{p.name} · {formatINR(p.monthly_income_paise)}</div>
                        <div className="text-6xl font-bold" style={{ color: bandColor[p.band] }}>{p.score}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-center font-semibold mt-4">{t('screen.fairness.highlight')}</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-card border border-line shadow-card divide-y divide-line">
              {data.tests.map((x) => (
                <div key={x.code} className="flex items-start gap-3 p-4">
                  <span className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${x.passed ? 'bg-green-100 text-strong' : 'bg-red-100 text-risk'}`}>
                    {x.passed ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </span>
                  <div>
                    <div className="font-medium">{t(`fairness.${x.code}`, { defaultValue: x.code })}</div>
                    <div className="text-sm text-muted">{i18n.language === 'en' ? x.detail : t(`fairnessDetail.${x.code}`, { defaultValue: x.detail })}</div>
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
