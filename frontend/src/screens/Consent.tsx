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
  const [agreed, setAgreed] = useState(false)
  const [open, setOpen] = useState<number | null>(null)

  const rows = [
    { icon: FileText, text: t('screen.consent.read'), detail: t('screen.consent.readDetail') },
    { icon: Target, text: t('screen.consent.why'), detail: t('screen.consent.whyDetail') },
    { icon: Clock, text: t('screen.consent.keep'), detail: t('screen.consent.keepDetail') },
    { icon: ShieldCheck, text: t('screen.consent.stop'), detail: t('screen.consent.stopDetail') },
  ]

  async function allow() {
    if (!agreed) return
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
        {rows.map(({ icon: Icon, text, detail }, i) => (
          <div key={i} className="flex items-start gap-3 bg-white border border-line rounded-card p-4">
            <div className="w-9 h-9 rounded-full bg-teal-50 text-brand flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div className="text-sm pt-1.5 min-w-0 flex-1">
              <div className="font-semibold">{text}</div>
              <p id={`consent-detail-${i}`} className={`text-muted mt-1 ${open === i ? '' : 'line-clamp-2'}`}>{detail}</p>
              <button type="button" className="text-xs text-brand underline mt-1 !min-h-0"
                aria-expanded={open === i} aria-controls={`consent-detail-${i}`}
                onClick={() => setOpen(open === i ? null : i)}>
                {open === i ? t('screen.consent.less') : t('screen.consent.more')}
              </button>
            </div>
          </div>
        ))}
        <p className="text-sm font-medium text-center py-1">{t('screen.consent.never')}</p>
        <details className="bg-white border border-line rounded-card p-4 text-sm">
          <summary className="cursor-pointer font-semibold text-brand">{t('screen.consent.noticeTitle')}</summary>
          <ul className="mt-2 space-y-1.5 text-muted list-disc pl-5">
            <li>{t('screen.consent.noticePurpose')}</li>
            <li>{t('screen.consent.noticeData')}</li>
            <li>{t('screen.consent.noticeRetention')}</li>
            <li>{t('screen.consent.noticeRights')}</li>
            <li>{t('screen.consent.noticeContact')}</li>
          </ul>
        </details>
        <div className="flex items-start gap-3 bg-white border border-line rounded-card p-4">
          <input id="consent-agree" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 w-5 h-5 accent-brand flex-shrink-0" />
          <label htmlFor="consent-agree" className="text-sm cursor-pointer">{t('screen.consent.agree')}</label>
        </div>
        <Button onClick={allow} loading={loading} disabled={!agreed}>{t('screen.consent.allow')}</Button>
        <Button variant="ghost" onClick={() => navigate('/language')}>{t('screen.consent.notNow')}</Button>
      </div>
    </div>
  )
}
