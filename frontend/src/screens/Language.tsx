import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '../components/Button'
import { useSession } from '../state/session'
import type { Lang } from '../api/types'

const options: { lang: Lang; label: string }[] = [
  { lang: 'en', label: 'English' },
  { lang: 'hi', label: 'हिंदी' },
  { lang: 'mr', label: 'मराठी' },
]

export default function Language() {
  const { t } = useTranslation()
  const { setLanguage } = useSession()
  const navigate = useNavigate()
  return (
    <div className="min-h-[640px] flex flex-col justify-center px-6 py-10">
      <h1 className="text-[32px] font-semibold text-brand text-center">SahayakFin</h1>
      <p className="text-center text-muted mt-2 mb-10">{t('screen.language.tagline')}</p>
      <div className="space-y-3">
        {options.map((o) => (
          <Button
            key={o.lang}
            variant="secondary"
            className="text-lg"
            onClick={() => { setLanguage(o.lang); navigate('/login') }}
          >
            {o.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
