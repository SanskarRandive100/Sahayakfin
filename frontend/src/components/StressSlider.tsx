import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../api/endpoints'
import type { StressResult } from '../api/types'
import Chip from './Chip'

const SHOCKS = [0.1, 0.2, 0.3]

export default function StressSlider({ instalmentPaise }: { instalmentPaise: number }) {
  const { t } = useTranslation()
  const [shock, setShock] = useState<number | null>(null)
  const [res, setRes] = useState<StressResult | null>(null)
  const [busy, setBusy] = useState(false)

  async function pick(s: number) {
    setShock(s); setBusy(true)
    try { setRes(await api.stress(s, instalmentPaise)) } catch { setRes(null) } finally { setBusy(false) }
  }

  const variant = res?.light === 'GREEN' ? 'green' : res?.light === 'AMBER' ? 'amber' : 'red'
  return (
    <div className="mt-3 rounded-xl bg-gray-50 p-3">
      <div className="text-sm font-medium mb-2">{t('stress.title')}</div>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label={t('stress.title')}>
        {SHOCKS.map((s) => (
          <button
            key={s}
            onClick={() => pick(s)}
            aria-pressed={shock === s}
            className={`h-11 rounded-lg text-sm font-semibold border ${shock === s ? 'bg-brand text-white border-brand' : 'bg-white border-line'}`}
          >
            −{Math.round(s * 100)}%
          </button>
        ))}
      </div>
      {busy && <div className="text-xs text-muted mt-2">{t('common.loading')}</div>}
      {res && !busy && (
        <div className="mt-2 space-y-1">
          <Chip variant={variant}>{t(`light.${res.light}`)}</Chip>
          <div className="text-sm">{t('stress.covered', { done: res.weeks_covered, total: res.weeks_total })}</div>
          <div className="text-xs text-muted">{t(`advice.${res.advice}`, { defaultValue: '' })}</div>
        </div>
      )}
    </div>
  )
}
