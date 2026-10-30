import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { Home, Landmark, ListChecks, LogOut, ShieldCheck, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSession } from '../state/session'

export function initials(name: string | undefined): string {
  return (name ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '•'
}

export const NAV = [
  { to: '/app/dashboard', icon: Home, key: 'nav.home' },
  { to: '/app/transactions', icon: ListChecks, key: 'nav.transactions', desktopOnly: true },
  { to: '/app/loans', icon: Landmark, key: 'nav.loans' },
  { to: '/app/money', icon: Wallet, key: 'nav.money' },
  { to: '/app/privacy', icon: ShieldCheck, key: 'nav.privacy' },
]

export default function AppShell() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useSession()
  const reduce = useReducedMotion()
  return (
    <div className="min-h-screen bg-transparent md:flex [&_button]:min-h-11 [&_a]:min-h-11">
      <aside className="hidden md:flex md:w-[72px] lg:w-[240px] flex-shrink-0 flex-col glass-bar border-r border-white/70 shadow-[1px_0_0_rgba(15,35,60,0.06)] text-ink sticky top-0 h-screen">
        <NavLink to="/" className="h-16 flex items-center gap-2 px-5 text-lg font-semibold tracking-tight">
          <span className="w-2.5 h-2.5 rounded-sm bg-mark flex-shrink-0" aria-hidden />
          <span className="hidden lg:inline">Sahayak<span className="text-brand">Fin</span></span>
        </NavLink>
        <nav className="flex-1 px-3 pt-4 space-y-1" aria-label={t('nav.main')}>
          {NAV.map(({ to, icon: Icon, key }) => (
            <NavLink key={to} to={to} title={t(key)}
              className={({ isActive }) =>
                `relative flex items-center gap-3 h-11 px-3 rounded-full text-sm font-medium transition-colors duration-150 ${isActive ? 'bg-brand/10 text-brand-800 before:absolute before:-left-3 before:top-2 before:bottom-2 before:w-[3px] before:rounded-r before:bg-brand' : 'text-ink-2 hover:bg-white/70 hover:text-ink'}`}>
              <Icon className="w-6 h-6 flex-shrink-0" strokeWidth={1.75} />
              <span className="hidden lg:inline">{t(key)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/70 p-3 space-y-2">
          {user && (
            <div className="hidden lg:flex items-center gap-3 px-2">
              <span className="w-9 h-9 rounded-full bg-brand/[.12] text-brand-800 flex items-center justify-center text-sm font-semibold" aria-hidden>
                {initials(user.display_name)}
              </span>
              <div className="min-w-0">
                <div className="text-[11px] text-muted">{t('account.signedInAs')}</div>
                <div className="text-sm font-semibold truncate">{user.display_name}</div>
              </div>
            </div>
          )}
          <button onClick={() => { logout(); navigate('/', { replace: true }) }} title={t('account.logout')}
            className="w-full flex items-center gap-3 h-11 px-3 rounded-full text-sm font-medium text-ink-2 hover:bg-white/70 hover:text-ink">
            <LogOut className="w-5 h-5 flex-shrink-0" strokeWidth={1.75} />
            <span className="hidden lg:inline">{t('account.logout')}</span>
          </button>
          <div className="hidden lg:block px-2 text-[11px] leading-4 text-muted">{t('site.footer.proto')}</div>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <motion.div key={location.pathname} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.18, ease: 'easeOut' }} className="max-w-[1160px] mx-auto">
          <Outlet />
        </motion.div>
      </main>
    </div>
  )
}
