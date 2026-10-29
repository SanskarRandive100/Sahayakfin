import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { animate, motion, useInView, useReducedMotion } from 'motion/react'

export function NumberTicker({ value, decimals = 0, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  const [n, setN] = useState(reduce ? value : 0)
  useEffect(() => {
    if (!inView || reduce) { if (reduce) setN(value); return }
    const c = animate(0, value, { duration: 1.4, ease: [0.22, 1, 0.36, 1], onUpdate: setN })
    return () => c.stop()
  }, [inView, value, reduce])
  return <span ref={ref} className="tabular-nums">{n.toFixed(decimals)}{suffix}</span>
}

export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div className={className} initial={reduce ? false : { opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.25, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  )
}

/** A rotating gradient border around a card (Border Beam style). */
export function BorderBeam({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <div className="relative rounded-[20px] p-[2px] overflow-hidden">
      {!reduce && (
        <motion.div aria-hidden className="absolute -inset-[100%]"
          style={{ background: 'conic-gradient(from 0deg, transparent 0 70%, #F5B700 85%, #CCFBF1 100%)' }}
          animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }} />
      )}
      <div className="relative rounded-[18px] bg-white">{children}</div>
    </div>
  )
}

/** Data-flow beam between nodes: dashes travel along a line. */
export function Beam({ vertical = false }: { vertical?: boolean }) {
  const reduce = useReducedMotion()
  return (
    <svg aria-hidden className={vertical ? 'h-10 w-4 mx-auto' : 'h-4 w-full'} viewBox={vertical ? '0 0 16 40' : '0 0 100 16'} preserveAspectRatio="none">
      <line x1={vertical ? 8 : 0} y1={vertical ? 0 : 8} x2={vertical ? 8 : 100} y2={vertical ? 40 : 8}
        stroke="#0F766E" strokeWidth="2.5" strokeDasharray="6 8" strokeLinecap="round" vectorEffect="non-scaling-stroke">
        {!reduce && <animate attributeName="stroke-dashoffset" from="28" to="0" dur="1.2s" repeatCount="indefinite" />}
      </line>
    </svg>
  )
}

export function Marquee({ items }: { items: string[] }) {
  const reduce = useReducedMotion()
  const row = [...items, ...items]
  return (
    <div className="overflow-hidden" aria-label={items.join(', ')}>
      <motion.div className="flex gap-10 w-max text-white/70 text-sm font-semibold"
        animate={reduce ? undefined : { x: ['0%', '-50%'] }} transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}>
        {row.map((x, i) => <span key={i}>{x}</span>)}
      </motion.div>
    </div>
  )
}
