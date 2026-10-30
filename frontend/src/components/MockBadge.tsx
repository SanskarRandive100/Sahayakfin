import { useTranslation } from 'react-i18next'
import { isMockMode } from '../api/client'

export default function MockBadge() {
  const { t } = useTranslation()
  if (!isMockMode()) return null
  return (
    <div data-testid="mock-mode-badge" role="status"
      className="fixed bottom-2 left-2 z-[100] rounded bg-amber-300 px-3 py-1 text-xs font-semibold text-amber-950 shadow">
      {t('runtime.mockMode', { defaultValue: 'OFFLINE MODE' })}
    </div>
  )
}
