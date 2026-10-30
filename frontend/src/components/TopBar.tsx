import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import LanguageSwitch from './LanguageSwitch'
import { useTranslation } from 'react-i18next'

interface TopBarProps {
  title?: string
  back?: boolean | (() => void)
  right?: React.ReactNode
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
        <div className="flex flex-wrap items-center justify-end gap-2">{right}<LanguageSwitch /></div>
      </div>
    </div>
  )
}
