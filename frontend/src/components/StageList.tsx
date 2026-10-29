import { FileSearch, EyeOff, Tags, Gauge, Check, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const stages = [
  { code: 'READ', icon: FileSearch },
  { code: 'MASK', icon: EyeOff },
  { code: 'CATEGORISE', icon: Tags },
  { code: 'SCORE', icon: Gauge },
] as const

export default function StageList({
  doneCount, msByCode,
}: { doneCount: number; msByCode: Record<string, number> }) {
  const { t } = useTranslation()
  return (
    <ul className="space-y-3">
      {stages.map(({ code, icon: Icon }, i) => {
        const done = i < doneCount
        const active = i === doneCount
        return (
          <li key={code} className="flex items-center gap-3 bg-white rounded-xl border border-line p-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-muted'}`}>
              {done ? <Check className="w-5 h-5" /> : active ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
            </div>
            <div className="flex-1 text-base">{t(`screen.processing.${code}`)}</div>
            {done && msByCode[code] !== undefined && (
              <div className="text-xs text-muted">{(msByCode[code] / 1000).toFixed(2)} s</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
