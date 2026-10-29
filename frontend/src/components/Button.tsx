import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  loading?: boolean
  full?: boolean
  children: ReactNode
}

const classes = {
  primary: 'bg-brand text-white hover:bg-teal-700 active:bg-teal-800 disabled:bg-teal-800/50',
  secondary: 'bg-white text-ink border border-line hover:bg-gray-50 active:bg-gray-100 disabled:text-muted',
  ghost: 'bg-transparent text-brand hover:bg-teal-50 active:bg-teal-100',
  danger: 'bg-white text-red-700 border border-red-300 hover:bg-red-50 active:bg-red-100',
}

export default function Button({
  variant = 'primary',
  loading = false,
  full = true,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-colors',
        'h-[52px] px-4 text-base',
        full ? 'w-full' : '',
        classes[variant],
        'disabled:cursor-not-allowed',
        className,
      ].join(' ')}
    >
      {loading && <Loader2 className="w-5 h-5 animate-spin" />}
      {children}
    </button>
  )
}
