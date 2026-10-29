import { useSession } from '../state/session'
import type { Lang } from '../api/types'

const labels: Record<Lang, string> = { en: 'EN', hi: 'हिं', mr: 'मरा' }

export default function LanguageSwitch() {
  const { language, setLanguage } = useSession()
  const current = language ?? 'en'
  return (
    <div className="inline-flex rounded-full bg-white border border-line text-xs font-medium overflow-hidden">
      {(['en', 'hi', 'mr'] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLanguage(l)}
          aria-pressed={current === l}
          className={[
            'px-2 h-8 min-w-[36px]',
            current === l ? 'bg-brand text-white' : 'text-ink hover:bg-gray-50',
          ].join(' ')}
        >
          {labels[l]}
        </button>
      ))}
    </div>
  )
}
