import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  loading?: boolean
  full?: boolean
  children: ReactNode
}

const classes = {
  primary: 'bg-brand text-white shadow-btn hover:bg-brand-800 active:bg-brand-800 disabled:bg-brand/50 disabled:shadow-none',
  secondary: 'bg-white/70 text-ink border border-line hover:bg-white active:bg-white disabled:text-muted',
  ghost: 'bg-transparent text-brand hover:underline',
  danger: 'bg-white/70 text-risk border border-risk/40 hover:bg-risk/[.06] active:bg-risk/10',
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
