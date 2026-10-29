import { Lightbulb } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Tip } from '../api/types'

export default function TipCard({ tip, onTap }: { tip: Tip; onTap: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      onClick={onTap}
      className="w-full text-left bg-teal-50 border border-teal-100 rounded-card p-4 flex items-start gap-3 active:bg-teal-100"
    >
      <Lightbulb className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
      <div className="text-sm">{String(t(`tip.${tip.code}`, { points: tip.points, ...(tip.params ?? {}) } as Record<string, unknown>))}</div>
    </button>
  )
}
