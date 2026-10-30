import { Link, Outlet, useLocation } from 'react-router-dom'
import { useSession } from '../state/session'
import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const STEPS = ['/language', '/login', '/consent', '/connect', '/processing']

export default function WizardLayout() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const current = Math.max(0, STEPS.indexOf(pathname))
  const { token, user } = useSession()
  const dashboard = user?.role === 'LENDER' ? '/lender' : '/app/dashboard'
  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-[560px] flex items-center justify-between gap-3 mb-6">
        <Link to="/" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline">{t('nav12.home')}</Link>
        <Link to="/" className="inline-flex items-center gap-2 text-xl font-semibold text-ink"><span className="w-2.5 h-2.5 rounded-sm bg-mark" aria-hidden />Sahayak<span className="text-brand">Fin</span></Link>
        {token ? (
          <Link to={dashboard} className="inline-flex min-h-11 items-center px-3 rounded-btn bg-brand text-white text-sm font-semibold hover:bg-brand-800">{t('nav12.goDashboard')}</Link>
        ) : <span className="w-16" aria-hidden="true" />}
      </div>
      <ol className="flex items-center gap-2 mb-6 w-full max-w-[560px]" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1 flex flex-col items-center gap-1" aria-current={i === current ? 'step' : undefined}>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border ${
              i < current ? 'bg-brand border-brand text-white' : i === current ? 'border-brand text-brand bg-white/80' : 'border-line text-muted bg-white/60'}`}>
              {i < current ? <Check className="w-4 h-4" /> : i + 1}
            </span>
            <span className={`text-[11px] text-center ${i === current ? 'text-ink font-semibold' : 'text-muted'}`}>{t(`wizard.step${i}`)}</span>
          </li>
        ))}
      </ol>
      <div className="w-full max-w-[560px] glass rounded-card overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}
