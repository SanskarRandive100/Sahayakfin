import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import LanguageSwitch from './LanguageSwitch'
import { useTranslation } from 'react-i18next'
import { useSession } from '../state/session'

interface TopBarProps {
  title?: string
  back?: boolean | (() => void)
  right?: React.ReactNode
}

function AvatarMenu() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, token, logout } = useSession()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])
  if (!user || !token) return null
  const initials = user.display_name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label={t('account.menu')} aria-haspopup="menu" aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="w-10 h-10 rounded-full bg-brand text-white text-sm font-semibold inline-flex items-center justify-center">
        {initials || '•'}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-56 bg-white border border-line rounded-xl shadow-lg p-2 z-20">
          <div className="px-3 py-2 text-xs text-muted">{t('account.signedInAs')}</div>
          <div className="px-3 pb-2 text-sm font-semibold truncate">{user.display_name}</div>
          <button type="button" role="menuitem"
            onClick={() => { setOpen(false); logout(); navigate('/', { replace: true }) }}
            className="w-full flex items-center gap-2 h-11 px-3 rounded-lg text-sm hover:bg-gray-100">
            <LogOut className="w-4 h-4" /> {t('account.logout')}
          </button>
        </div>
      )}
    </div>
  )
}

export default function TopBar({ title, back, right }: TopBarProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const onBack = () => {
    if (typeof back === 'function') back()
    else navigate(-1)
  }
  return (
    <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur border-b border-line">
      <div className="min-h-16 py-2 px-3 flex flex-wrap items-center gap-2">
        {back ? (
          <button
            aria-label={t('common.back')}
            onClick={onBack}
            className="w-11 h-11 inline-flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="hidden sm:block w-11" />
        )}
        <div className="flex-1 min-w-[120px] text-base font-semibold text-center">{title}</div>
        <div className="flex flex-wrap items-center justify-end gap-2">{right}<LanguageSwitch /><AvatarMenu /></div>
      </div>
    </div>
  )
}
