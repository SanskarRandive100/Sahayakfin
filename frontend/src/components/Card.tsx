import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export default function Card({ children, className = '', ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={['bg-white rounded-card border border-line shadow-card p-4', className].join(' ')}
    >
      {children}
    </div>
  )
}
