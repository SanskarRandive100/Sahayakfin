import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '../components/Button'
import ErrorBanner from '../components/ErrorBanner'
import LanguageSwitch from '../components/LanguageSwitch'
import { api } from '../api/endpoints'
import { errText } from '../lib/errors'
import { useSession } from '../state/session'

export default function LenderLogin() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { token, user, setToken, setUser } = useSession()
  const [phone, setPhone] = useState('9999999991')
  const [otp, setOtp] = useState('123456')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function go() {
    setBusy(true); setError(null)
    try {
      const r = await api.verifyOtp(phone, otp)
      if (r.user.role !== 'LENDER') { setError(t('error.FORBIDDEN')); return }
      setToken(r.access_token); setUser(r.user)
      navigate('/lender')
    } catch (e) { setError(errText(t, e)) } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 gap-4">
      <div className="w-full max-w-sm flex items-center justify-between gap-3">
        <Link to="/" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline">{t('nav12.home')}</Link>
        {token && (
          <Link to={user?.role === 'LENDER' ? '/lender' : '/app/dashboard'} className="inline-flex min-h-11 items-center px-3 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-800">{t('nav12.goDashboard')}</Link>
        )}
      </div>
      <div className="bg-white rounded-card border border-line p-6 w-full max-w-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-semibold">{t('screen.lender.loginTitle')}</h1><LanguageSwitch /></div>
        <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" aria-label={t('screen.login.phone')}
          className="w-full h-12 rounded-xl border border-line px-3" />
        <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" aria-label={t('screen.login.otp')}
          className="w-full h-12 rounded-xl border border-line px-3" />
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <Button onClick={go} loading={busy} disabled={phone.length !== 10 || otp.length !== 6}>{t('screen.login.verify')}</Button>
      </div>
    </div>
  )
}
