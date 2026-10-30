import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export default function Card({ children, className = '', ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={['glass rounded-card p-5 md:p-6', className].join(' ')}
    >
      {children}
    </div>
  )
}
