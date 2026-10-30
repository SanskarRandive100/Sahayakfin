import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export default function Sheet({ open, onClose, title, children }: SheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/30 fade-in" onClick={onClose} />
      <div className="relative w-full glass rounded-t-card p-5 pb-6 max-h-[80vh] overflow-y-auto rise-in">
        <div className="h-1 w-10 bg-line rounded-full mx-auto mb-3" />
        {title && <div className="text-base font-semibold mb-3">{title}</div>}
        {children}
      </div>
    </div>
  )
}
