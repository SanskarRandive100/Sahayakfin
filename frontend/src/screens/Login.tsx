import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '../components/Button'
import ErrorBanner from '../components/ErrorBanner'
import TopBar from '../components/TopBar'
import { api } from '../api/endpoints'
import { errText } from '../lib/errors'
import { useSession } from '../state/session'

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { language, setToken, setUser, setConsentId } = useSession()
  const [phone, setPhone] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const refs = useRef<Array<HTMLInputElement | null>>([])

  async function sendOtp() {
    setLoading(true); setError(null)
    try {
      await api.requestOtp(phone)
      setStep('otp')
    } catch (e) { setError(errText(t, e)) } finally { setLoading(false) }
  }

  async function verify() {
    setLoading(true); setError(null)
    try {
      const res = await api.verifyOtp(phone, digits.join(''))
      setToken(res.access_token)
      setUser(res.user)
      // token is read from localStorage by the client; persist before next call
      try {
        const raw = JSON.parse(localStorage.getItem('sahayakfin.session') || '{}')
        localStorage.setItem('sahayakfin.session', JSON.stringify({ ...raw, token: res.access_token }))
      } catch { /* ignore */ }
      if (language) { try { await api.patchMe({ language }) } catch { /* non-fatal */ } }
      const me = await api.getMe()
      setUser(me.user)
      const consents = me.has_active_consent ? await api.getConsents() : []
      const active = consents.find((consent) => consent.status === 'ACTIVE')
      setConsentId(active?.id ?? null)
      if (!active) navigate('/consent', { replace: true })
      else if (!me.has_score) navigate('/connect', { replace: true })
      else navigate('/score', { replace: true })
    } catch (e) { setError(errText(t, e)) } finally { setLoading(false) }
  }

  function onDigit(i: number, v: string) {
    const d = v.replace(/\D/g, '').slice(-1)
    const next = [...digits]; next[i] = d; setDigits(next)
    if (d && i < 5) refs.current[i + 1]?.focus()
  }

  return (
    <div>
      <TopBar title={t('screen.login.title')} back={() => navigate('/language')} />
      <div className="p-4 space-y-4">
        {error && <ErrorBanner>{error}</ErrorBanner>}
        {step === 'phone' ? (
          <>
            <label className="block text-sm font-medium">{t('screen.login.phone')}</label>
            <input
              inputMode="numeric" maxLength={10} value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="9000000001"
              className="w-full h-[52px] rounded-btn border border-line bg-white px-4 text-lg tracking-wider"
            />
            <Button onClick={sendOtp} loading={loading} disabled={phone.length !== 10}>{t('screen.login.sendOtp')}</Button>
          </>
        ) : (
          <>
            <label className="block text-sm font-medium">{t('screen.login.otp')}</label>
            <div className="flex gap-2 justify-between">
              {digits.map((d, i) => (
                <input
                  key={i} ref={(el) => (refs.current[i] = el)}
                  inputMode="numeric" value={d} aria-label={`${i + 1}`}
                  onChange={(e) => onDigit(i, e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Backspace' && !d && i > 0) refs.current[i - 1]?.focus() }}
                  className="w-12 h-14 rounded-btn border border-line bg-white text-center text-xl font-semibold"
                />
              ))}
            </div>
            <Button onClick={verify} loading={loading} disabled={digits.some((x) => !x)}>{t('screen.login.verify')}</Button>
          </>
        )}
      </div>
    </div>
  )
}
