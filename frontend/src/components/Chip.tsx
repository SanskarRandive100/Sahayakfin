import type { ReactNode } from 'react'

type Variant = 'default' | 'green' | 'amber' | 'red' | 'grey' | 'brand'

const styles: Record<Variant, string> = {
  default: 'bg-ink/[.06] text-ink-2',
  green: 'bg-strong/[.12] text-strong',
  amber: 'bg-fair/[.12] text-fair-ink',
  red: 'bg-risk/[.12] text-risk',
  grey: 'bg-building/[.12] text-ink-2',
  brand: 'bg-brand/[.12] text-brand-800',
}

export default function Chip({
  children, variant = 'default', className = '',
}: { children: ReactNode; variant?: Variant; className?: string }) {
  return (
    <span className={['inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-0.5', styles[variant], className].join(' ')}>
      {children}
    </span>
  )
}
