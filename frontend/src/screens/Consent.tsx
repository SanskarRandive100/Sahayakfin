import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Clock, FileText, ShieldCheck, Target } from 'lucide-react'
import Button from '../components/Button'
import ErrorBanner from '../components/ErrorBanner'
import TopBar from '../components/TopBar'
import { api } from '../api/endpoints'
import { errText } from '../lib/errors'
import { useSession } from '../state/session'

export default function Consent() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setConsentId } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rows = [
    { icon: FileText, text: t('screen.consent.read') },
    { icon: Target, text: t('screen.consent.why') },
    { icon: Clock, text: t('screen.consent.keep') },
    { icon: ShieldCheck, text: t('screen.consent.stop') },
  ]

  async function allow() {
    setLoading(true); setError(null)
    try {
      const c = await api.createConsent()
      setConsentId(c.id)
      navigate('/connect')
    } catch (e) { setError(errText(t, e)) } finally { setLoading(false) }
  }

  return (
    <div>
      <TopBar title={t('screen.consent.title')} />
      <div className="p-4 space-y-3">
        {error && <ErrorBanner>{error}</ErrorBanner>}
        {rows.map(({ icon: Icon, text }, i) => (
          <div key={i} className="flex items-start gap-3 bg-white border border-line rounded-card p-4">
            <div className="w-9 h-9 rounded-full bg-teal-50 text-brand flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div className="text-sm pt-1.5">{text}</div>
          </div>
        ))}
        <p className="text-xs text-muted text-center py-2">{t('screen.consent.never')}</p>
        <Button onClick={allow} loading={loading}>{t('screen.consent.allow')}</Button>
        <Button variant="ghost" onClick={() => navigate('/language')}>{t('screen.consent.notNow')}</Button>
      </div>
    </div>
  )
}
