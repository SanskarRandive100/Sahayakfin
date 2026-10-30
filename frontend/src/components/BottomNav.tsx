import { NavLink } from 'react-router-dom'
import { Home, Landmark, ShieldCheck, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const items = [
  { to: '/app/dashboard', icon: Home, key: 'nav.home' },
  { to: '/app/loans', icon: Landmark, key: 'nav.loans' },
  { to: '/app/money', icon: Wallet, key: 'nav.money' },
  { to: '/app/privacy', icon: ShieldCheck, key: 'nav.privacy' },
]

export default function BottomNav() {
  const { t } = useTranslation()
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 glass-bar border-t border-white/70 shadow-[0_-1px_0_rgba(15,35,60,0.06)] grid grid-cols-4" aria-label={t('nav.main')}>
      {items.map(({ to, icon: Icon, key }) => (
        <NavLink key={to} to={to}
          className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 h-16 text-xs ${isActive ? 'text-brand font-semibold' : 'text-ink-2'}`}>
          <Icon className="w-6 h-6" strokeWidth={1.75} />
          {t(key)}
        </NavLink>
      ))}
    </nav>
  )
}
