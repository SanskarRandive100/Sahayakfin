import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'

type ToastKind = 'info' | 'success' | 'error'
interface ToastCtx { show: (text: string, kind?: ToastKind) => void }

const show: ToastCtx['show'] = (text, kind = 'info') => {
  if (kind === 'success') toast.success(text)
  else if (kind === 'error') toast.error(text)
  else toast(text)
}

const Ctx = createContext<ToastCtx>({ show })

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <Toaster position="top-center" duration={2500} richColors />
    </Ctx.Provider>
  )
}

export function useToast() {
  return useContext(Ctx)
}

export function useOptionalToast(): ToastCtx {
  return useContext(Ctx)
}
