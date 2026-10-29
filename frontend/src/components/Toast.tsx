import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

type ToastKind = 'info' | 'success' | 'error'
interface ToastItem { id: number; text: string; kind: ToastKind }
interface ToastCtx { show: (text: string, kind?: ToastKind) => void }

const Ctx = createContext<ToastCtx | null>(null)

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const show = useCallback((text: string, kind: ToastKind = 'info') => {
    const id = nextId++
    setItems((prev) => [...prev, { id, text, kind }])
    window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2500)
  }, [])

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed top-4 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            className={[
              'pointer-events-auto max-w-sm w-full text-center text-sm font-medium rounded-xl px-4 py-3 shadow-lg',
              t.kind === 'success' ? 'bg-green-700 text-white'
                : t.kind === 'error' ? 'bg-red-700 text-white'
                : 'bg-ink text-white',
            ].join(' ')}
          >
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const c = useContext(Ctx)
  if (!c) {
    return { show: (t: string) => { if (typeof window !== 'undefined') console.log('[toast]', t) } }
  }
  return c
}

// Allow modules that import from here without a provider to call noop safely
export function useOptionalToast(): ToastCtx {
  const c = useContext(Ctx)
  return c ?? { show: () => undefined }
}
