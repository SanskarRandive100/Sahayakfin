import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  loading?: boolean
  full?: boolean
  children: ReactNode
}

const classes = {
  primary: 'bg-brand text-white hover:bg-brand-800 active:bg-brand-800 disabled:bg-brand/50',
  secondary: 'bg-white text-ink border border-line hover:bg-tint active:bg-tint disabled:text-muted',
  ghost: 'bg-transparent text-brand hover:bg-brand-50 active:bg-brand-100',
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
        'inline-flex items-center justify-center gap-2 font-medium rounded-btn transition-colors duration-150',
        'h-12 px-5 text-base',
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
