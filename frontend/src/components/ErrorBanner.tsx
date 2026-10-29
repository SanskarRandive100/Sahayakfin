import { AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'

export default function ErrorBanner({
  children, onRetry,
}: { children: ReactNode; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 px-3 py-3 flex items-start gap-2">
      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">{children}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-semibold underline whitespace-nowrap"
        >
          Retry
        </button>
      )}
    </div>
  )
}
