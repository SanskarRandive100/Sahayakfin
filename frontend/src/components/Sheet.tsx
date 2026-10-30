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
      <div className="absolute inset-0 bg-black/40 fade-in" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-2xl p-4 pb-6 max-h-[80vh] overflow-y-auto fade-in">
        <div className="h-1 w-10 bg-tint rounded-full mx-auto mb-3" />
        {title && <div className="text-base font-semibold mb-3">{title}</div>}
        {children}
      </div>
    </div>
  )
}
