import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../api/endpoints'
import type { StressResult } from '../api/types'
import RiskGraph from '../charts/RiskGraph'

export default function BadWeekTest({ instalmentPaise, defaultOpen = false }: { instalmentPaise: number; defaultOpen?: boolean }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(defaultOpen)
  const [shock, setShock] = useState(0.2)
  const [res, setRes] = useState<StressResult | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || instalmentPaise <= 0) return
    let live = true
    setLoading(true)
    api.stress(shock, instalmentPaise).then((r) => live && setRes(r)).catch(() => live && setRes(null)).finally(() => live && setLoading(false))
    return () => { live = false }
  }, [open, shock, instalmentPaise])

  return (
    <div className="mt-3 rounded-btn border border-line">
      <button onClick={() => setOpen(!open)} aria-expanded={open}
        className="w-full flex items-center justify-between px-3 h-12 text-sm font-semibold text-brand">
        {t('stress.title')}
        <ChevronDown className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-3 pb-3">
          <RiskGraph result={res} instalmentPaise={instalmentPaise} shock={shock} onShockChange={setShock} loading={loading} />
        </div>
      )}
    </div>
  )
}
