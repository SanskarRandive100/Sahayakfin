import { useTranslation } from 'react-i18next'
import type { ScoreComponent } from '../api/types'

export default function ComponentBar({ name, c }: { name: string; c: ScoreComponent }) {
  const { t } = useTranslation()
  return (
    <div className="py-2">
      <div className="flex justify-between text-sm font-medium">
        <span>{t(`component.${name}.label`)}</span>
        <span>{c.available ? Math.round(c.value) : '–'}</span>
      </div>
      <div className="h-2 bg-tint rounded-full mt-1.5 overflow-hidden">
        {c.available && <div className="h-full bg-brand rounded-full" style={{ width: `${Math.max(0, Math.min(100, c.value))}%` }} />}
      </div>
      <div className="text-xs text-muted mt-1">
        {c.available ? t(`component.${name}.desc`) : t('screen.score.unavailable')}
      </div>
    </div>
  )
}
