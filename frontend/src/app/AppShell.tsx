import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { Home, Landmark, ListChecks, ShieldCheck, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
  const reduce = useReducedMotion()
  return (
    <div className="min-h-screen bg-bg md:flex">
      <aside className="hidden md:flex md:w-[72px] lg:w-[240px] flex-shrink-0 flex-col bg-brand-900 text-white sticky top-0 h-screen">
        <NavLink to="/" className="h-16 flex items-center px-5 text-lg font-bold tracking-tight">
          <span className="lg:hidden">S</span>
          <span className="hidden lg:inline">Sahayak<span className="text-brand-100">Fin</span></span>
        </NavLink>
        <nav className="flex-1 px-3 space-y-1" aria-label="Main">
          {NAV.map(({ to, icon: Icon, key }) => (
            <NavLink key={to} to={to} title={t(key)}
              className={({ isActive }) =>
                `flex items-center gap-3 h-11 px-3 rounded-xl text-sm font-medium ${isActive ? 'bg-brand text-white' : 'text-white/80 hover:bg-white/10'}`}>
              <Icon className="w-6 h-6 flex-shrink-0" strokeWidth={1.75} />
              <span className="hidden lg:inline">{t(key)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="hidden lg:block p-4 text-xs text-white/60">{t('site.footer.proto')}</div>
      </aside>
      <main className="flex-1 min-w-0">
        <motion.div key={location.pathname} initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="max-w-[1200px] mx-auto">
          <Outlet />
        </motion.div>
      </main>
    </div>
  )
}
