import { Outlet, useLocation } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const STEPS = ['/language', '/login', '/consent', '/connect', '/processing']

export default function WizardLayout() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const current = Math.max(0, STEPS.indexOf(pathname))
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-bg flex flex-col items-center px-4 py-8">
      <a href="/" className="text-xl font-bold text-brand mb-6">Sahayak<span className="text-ink">Fin</span></a>
      <ol className="flex items-center gap-2 mb-6 w-full max-w-[560px]" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1 flex flex-col items-center gap-1" aria-current={i === current ? 'step' : undefined}>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 ${
              i < current ? 'bg-brand border-brand text-white' : i === current ? 'border-brand text-brand bg-white' : 'border-line text-muted bg-white'}`}>
              {i < current ? <Check className="w-4 h-4" /> : i + 1}
            </span>
            <span className={`text-[11px] text-center ${i === current ? 'text-ink font-semibold' : 'text-muted'}`}>{t(`wizard.step${i}`)}</span>
          </li>
        ))}
      </ol>
      <div className="w-full max-w-[560px] bg-white rounded-card border border-line shadow-card overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}
