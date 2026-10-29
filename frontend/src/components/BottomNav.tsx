import { NavLink } from 'react-router-dom'
import { Home, Wallet, Landmark, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const items = [
  { to: '/score', icon: Home, key: 'nav.home' },
  { to: '/review', icon: Wallet, key: 'nav.money' },
  { to: '/loans', icon: Landmark, key: 'nav.loans' },
  { to: '/loan', icon: ShieldCheck, key: 'nav.privacy' },
]

export default function BottomNav() {
  const { t } = useTranslation()
  return (
    <nav className="sticky bottom-0 bg-white border-t border-line grid grid-cols-4">
      {items.map(({ to, icon: Icon, key }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 h-14 text-xs ${isActive ? 'text-brand font-semibold' : 'text-muted'}`
          }
        >
          <Icon className="w-5 h-5" />
          {t(key)}
        </NavLink>
      ))}
    </nav>
  )
}
