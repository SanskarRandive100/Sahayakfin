import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { animate, motion, useInView, useReducedMotion } from 'motion/react'

export function NumberTicker({ value, decimals = 0, suffix = '', format }: { value: number; decimals?: number; suffix?: string; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  const [n, setN] = useState(reduce ? value : 0)
  useEffect(() => {
    if (!inView || reduce) { if (reduce) setN(value); return }
    const c = animate(0, value, { duration: 1.4, ease: [0.22, 1, 0.36, 1], onUpdate: setN })
    return () => c.stop()
  }, [inView, value, reduce])
  return <span ref={ref} className="tabular-nums">{format ? format(Math.round(n)) : n.toFixed(decimals)}{suffix}</span>
}

export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div className={className} initial={reduce ? false : { opacity: 0 }} whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.2, delay, ease: 'easeOut' }}>
      {children}
    </motion.div>
  )
}

/** A plain white card with a hairline border. */
export function BorderBeam({ children }: { children: ReactNode }) {
  return <div className="rounded-card border border-line bg-white shadow-card">{children}</div>
}

/** A static hairline between steps. */
export function Beam({ vertical = false }: { vertical?: boolean }) {
  return <div aria-hidden className={vertical ? 'h-8 w-px mx-auto bg-line' : 'h-px w-full bg-line'} />
}

export function Marquee({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm font-medium text-ink-2">
      {[...new Set(items)].map((x) => <li key={x}>{x}</li>)}
    </ul>
  )
}
