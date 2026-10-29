import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Band } from '../api/types'
import { bandColor } from '../lib/band'

const W = 260
const H = 150
const CX = W / 2
const CY = 130
const R = 100

function polar(pct: number) {
  const a = Math.PI * (1 - pct / 100)
  return { x: CX + R * Math.cos(a), y: CY - R * Math.sin(a) }
}

function arc(from: number, to: number) {
  const a = polar(from)
  const b = polar(to)
  return `M ${a.x} ${a.y} A ${R} ${R} 0 0 1 ${b.x} ${b.y}`
}

export default function ScoreGauge({ score, band }: { score: number; band: Band }) {
  const { t } = useTranslation()
  const [shown, setShown] = useState(0)

  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 800)
      setShown(Math.round(score * p))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [score])

  const color = bandColor[band]
  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`${score} / 100`}>
        <path d={arc(0, 39)} stroke="#d1d5db" strokeWidth="14" fill="none" opacity="0.5" />
        <path d={arc(40, 59)} stroke="#fcd34d" strokeWidth="14" fill="none" opacity="0.5" />
        <path d={arc(60, 79)} stroke="#86efac" strokeWidth="14" fill="none" opacity="0.5" />
        <path d={arc(80, 100)} stroke="#4ade80" strokeWidth="14" fill="none" opacity="0.5" />
        {shown > 0 && <path d={arc(0, Math.min(shown, 99.9))} stroke={color} strokeWidth="14" fill="none" strokeLinecap="round" />}
      </svg>
      <div className="-mt-16 text-center">
        <div className="text-[56px] leading-none font-bold" style={{ color }}>{shown}</div>
        <div className="text-base font-semibold mt-1" style={{ color }}>{t(`band.${band}`)}</div>
      </div>
    </div>
  )
}
