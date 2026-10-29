import type { ReactNode } from 'react'

type Variant = 'default' | 'green' | 'amber' | 'red' | 'grey' | 'brand'

const styles: Record<Variant, string> = {
  default: 'bg-gray-100 text-ink',
  green: 'bg-green-50 text-green-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  grey: 'bg-gray-100 text-muted',
  brand: 'bg-teal-50 text-teal-700',
}

export default function Chip({
  children, variant = 'default', className = '',
}: { children: ReactNode; variant?: Variant; className?: string }) {
  return (
    <span className={['inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1', styles[variant], className].join(' ')}>
      {children}
    </span>
  )
}
