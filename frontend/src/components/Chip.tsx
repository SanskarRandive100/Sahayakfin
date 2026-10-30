import type { ReactNode } from 'react'

type Variant = 'default' | 'green' | 'amber' | 'red' | 'grey' | 'brand'

const styles: Record<Variant, string> = {
  default: 'bg-tint text-ink-2',
  green: 'bg-green-50 text-green-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  grey: 'bg-tint text-ink-2',
  brand: 'bg-brand-50 text-brand',
}

export default function Chip({
  children, variant = 'default', className = '',
}: { children: ReactNode; variant?: Variant; className?: string }) {
  return (
    <span className={['inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5', styles[variant], className].join(' ')}>
      {children}
    </span>
  )
}
