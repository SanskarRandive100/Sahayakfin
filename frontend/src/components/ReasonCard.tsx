import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Reason } from '../api/types'
import Card from './Card'

export default function ReasonCard({ reason }: { reason: Reason }) {
  const { t } = useTranslation()
  return (
    <Card className="flex items-start gap-3">
      <Info className="w-5 h-5 text-fair flex-shrink-0 mt-0.5" />
      <div className="text-sm">{String(t(`reason.${reason.code}`, (reason.params ?? {}) as Record<string, unknown>))}</div>
    </Card>
  )
}
