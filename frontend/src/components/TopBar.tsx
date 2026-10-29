import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import LanguageSwitch from './LanguageSwitch'

interface TopBarProps {
  title?: string
  back?: boolean | (() => void)
  right?: React.ReactNode
}

export default function TopBar({ title, back, right }: TopBarProps) {
  const navigate = useNavigate()
  const onBack = () => {
    if (typeof back === 'function') back()
    else navigate(-1)
  }
  return (
    <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur border-b border-line">
      <div className="h-14 px-3 flex items-center gap-2">
        {back ? (
          <button
            aria-label="Back"
            onClick={onBack}
            className="w-10 h-10 inline-flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-10" />
        )}
        <div className="flex-1 text-base font-semibold truncate text-center">{title}</div>
        <div className="min-w-[52px] flex justify-end">{right ?? <LanguageSwitch />}</div>
      </div>
    </div>
  )
}
