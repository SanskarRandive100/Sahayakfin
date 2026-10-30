import { Volume2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { speak, speechAvailable } from '../lib/speech'

export default function ReadAloudButton({ text }: { text: string }) {
  const { t, i18n } = useTranslation()
  if (!speechAvailable()) return null
  return (
    <button
      onClick={() => speak(text, i18n.language)}
      aria-label={t('readAloud')}
      className="inline-flex items-center gap-1.5 h-10 px-3 rounded-full border border-line bg-white/70 text-sm text-brand"
    >
      <Volume2 className="w-4 h-4" /> {t('readAloud')}
    </button>
  )
}
