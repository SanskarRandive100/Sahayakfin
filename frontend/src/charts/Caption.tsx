import type { ReactNode } from 'react'

export default function Caption({ children }: { children: ReactNode }) {
  return <p className="text-sm text-ink-2 mt-3">{children}</p>
}

export function Empty({ text }: { text: string }) {
  return <div className="text-sm text-muted text-center py-8">{text}</div>
}
