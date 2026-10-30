import { Fragment, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, Banknote, Building2, Eye, EyeOff, KeyRound, Landmark, PiggyBank, Receipt, ShieldCheck, Trash2, TrendingUp, Wallet,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../api/endpoints'
import type { FairnessReport } from '../api/types'
import LanguageSwitch from '../components/LanguageSwitch'
import ScoreGauge from '../components/ScoreGauge'
import ErrorBanner from '../components/ErrorBanner'
import Skeleton from '../components/Skeleton'
import { bandColor } from '../lib/band'
import { useSession } from '../state/session'
import { Beam, BorderBeam, Marquee, NumberTicker, Reveal } from './ui'

const PILLARS = [
  { k: 'steady', icon: TrendingUp, span: '' },
  { k: 'saving', icon: PiggyBank, span: '' },
  { k: 'bills', icon: Receipt, span: '' },
  { k: 'living', icon: Wallet, span: '' },
] as const

const firstName = (n: string) => n.split(' ')[0]

export default function Landing() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { token, user, logout } = useSession()
  const [report, setReport] = useState<FairnessReport | null>(null)
  const [error, setError] = useState(false)
  function load() {
    setError(false)
    api.getFairness().then(setReport).catch(() => { setReport(null); setError(true) })
  }
  useEffect(load, [])
  const personas = (report?.personas ?? []).filter((p) => ['Sunita', 'Arjun'].includes(firstName(p.name)))
  const ravi = report?.personas.find((p) => firstName(p.name) === 'Ravi')

  return (
    <div className="bg-white text-ink">
      <header className="sticky top-0 z-30 bg-brand-900/95 backdrop-blur text-white">
        <div className="max-w-[1200px] mx-auto min-h-16 py-2 px-4 flex flex-wrap items-center gap-3 lg:gap-6">
          <Link to="/" className="text-xl font-bold min-h-11 inline-flex items-center shrink-0">Sahayak<span className="text-brand-100">Fin</span></Link>
          <nav className="hidden lg:flex gap-6 text-sm text-white/80" aria-label="Sections">
            <a href="#how" className="inline-flex min-h-11 items-center hover:text-white">{t('site.nav.how')}</a>
            <Link to="/fairness" className="inline-flex min-h-11 items-center hover:text-white">{t('site.nav.fairness')}</Link>
            <a href="#privacy" className="inline-flex min-h-11 items-center hover:text-white">{t('site.nav.privacy')}</a>
            <a href="#lenders" className="inline-flex min-h-11 items-center hover:text-white">{t('site.nav.lenders')}</a>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <LanguageSwitch />
            <Link to="/lender/login" className="hidden lg:inline-flex min-h-11 items-center px-3 rounded-xl text-sm font-semibold text-white/90 hover:bg-white/10">{t('site.nav.lenderLogin')}</Link>
            {token ? (
              <>
                <button onClick={() => { logout(); navigate('/', { replace: true }) }}
                  className="hidden sm:inline-flex min-h-11 items-center px-3 rounded-xl text-sm font-semibold text-white/90 hover:bg-white/10">
                  {t('account.logout')}
                </button>
                <Link to="/app/dashboard" className="inline-flex min-h-11 items-center px-4 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-800">
                  {user ? t('account.openAppFor', { name: firstName(user.display_name) }) : t('account.openApp')}
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="inline-flex min-h-11 items-center px-3 rounded-xl text-sm font-semibold text-white/90 hover:bg-white/10">{t('account.login')}</Link>
                <Link to="/language" className="hidden sm:inline-flex min-h-11 items-center px-4 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-800">{t('site.nav.cta')}</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {error && <div className="max-w-[1200px] mx-auto p-4" role="status"><ErrorBanner onRetry={load}>{t('backend.unreachable')}</ErrorBanner></div>}
      <section className="bg-brand-900 text-white">
        <div className="max-w-[1200px] mx-auto px-4 py-16 md:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <h1 className="text-[34px] leading-[42px] md:text-[56px] md:leading-[64px] font-bold">
              {t('site.hero.h1a')} <span className="underline decoration-marigold decoration-4 underline-offset-8">{t('site.hero.h1b')}</span>
            </h1>
            <p className="mt-6 text-lg text-white/80 max-w-xl">{t('site.hero.sub')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/language" className="inline-flex h-12 items-center gap-2 px-6 rounded-xl bg-brand text-white font-semibold hover:bg-brand-800 ring-1 ring-white/20">
                {t('site.hero.cta1')} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/fairness" className="inline-flex h-12 items-center px-6 rounded-xl border border-white/30 text-white font-semibold hover:bg-white/10">{t('site.hero.cta2')}</Link>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="max-w-sm w-full mx-auto">
            <BorderBeam>
              <div className="p-6 flex flex-col items-center text-ink">
                {ravi ? <ScoreGauge score={ravi.score} band={ravi.band} /> : <Skeleton className="h-48 w-48 rounded-full" />}
                <div className="mt-4 text-sm text-ink-2 text-center">{t('site.hero.card')}</div>
              </div>
            </BorderBeam>
          </Reveal>
        </div>
        <div className="border-t border-white/10 py-4"><Marquee items={['UPI', 'NEFT', 'IMPS', 'Account Aggregator', 'PDF', 'CSV', 'UPI', 'NEFT', 'IMPS']} /></div>
      </section>

      <section className="bg-brand-50 py-16 md:py-24">
        <div className="max-w-[1200px] mx-auto px-4 grid md:grid-cols-2 gap-8 text-center">
          <Reveal>
            <div className="text-5xl font-bold text-brand"><NumberTicker value={7.7} decimals={1} /> M → <NumberTicker value={23.5} decimals={1} /> M</div>
            <p className="mt-3 text-ink-2">{t('site.problem.gig')}</p>
            <p className="text-xs text-muted mt-1">{t('site.problem.source')}</p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="text-5xl font-bold text-brand">{t('site.problem.most')}</div>
            <p className="mt-3 text-ink-2">{t('site.problem.nohistory')}</p>
          </Reveal>
        </div>
      </section>

      <section id="how" className="py-16 md:py-24">
        <div className="max-w-[1200px] mx-auto px-4">
          <Reveal><h2 className="text-2xl md:text-[32px] font-bold text-center mb-12">{t('site.how.title')}</h2></Reveal>
          <div className="grid md:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-4">
            {[
              { icon: Landmark, k: 'one' }, { icon: ShieldCheck, k: 'two' }, { icon: Building2, k: 'three' },
            ].map((s, i) => (
              <Fragment key={s.k}>
                <Reveal delay={i * 0.06} className="bg-white border border-line rounded-card shadow-card p-6 text-center h-full">
                  <div className="w-12 h-12 mx-auto rounded-full bg-brand-100 text-brand flex items-center justify-center"><s.icon className="w-6 h-6" /></div>
                  <h3 className="text-lg font-semibold mt-4">{t(`site.how.${s.k}.t`)}</h3>
                  <p className="text-sm text-ink-2 mt-1">{t(`site.how.${s.k}.d`)}</p>
                </Reveal>
                {i < 2 && <div className="w-full md:w-16"><div className="hidden md:block"><Beam /></div><div className="md:hidden"><Beam vertical /></div></div>}
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-bg py-16 md:py-24">
        <div className="max-w-[1200px] mx-auto px-4">
          <Reveal><h2 className="text-2xl md:text-[32px] font-bold text-center mb-12">{t('site.pillars.title')}</h2></Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p, i) => (
              <Reveal key={p.k} delay={i * 0.06} className={`bg-white border border-line rounded-card shadow-card p-6 ${p.span}`}>
                <p.icon className="w-6 h-6 text-brand" />
                <h3 className="text-lg font-semibold mt-3">{t(`site.pillars.${p.k}.t`)}</h3>
                <p className="text-sm text-ink-2 mt-1">{t(`site.pillars.${p.k}.d`)}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="max-w-[1000px] mx-auto px-4 text-center">
          <Reveal><h2 className="text-2xl md:text-[32px] font-bold">{t('site.fair.title')}</h2></Reveal>
          {!report && !error && <Skeleton className="h-40 w-full mt-10" />}
          <div className="grid grid-cols-2 gap-4 mt-10">
            {personas.map((p) => (
              <Reveal key={p.name} className="bg-white border border-line rounded-card shadow-card p-6">
                <div className="text-sm text-muted">{firstName(p.name)} · ₹{Math.round(p.monthly_income_paise / 100000)}k</div>
                <div className="text-6xl font-bold mt-2" style={{ color: bandColor[p.band] }}>{p.score}</div>
                <div className="text-sm font-semibold" style={{ color: bandColor[p.band] }}>{t(`band.${p.band}`)}</div>
              </Reveal>
            ))}
          </div>
          <p className="mt-8 text-lg text-ink-2">{t('site.fair.line')}</p>
          <Link to="/fairness" className="mt-6 inline-flex h-12 items-center px-6 rounded-xl bg-brand text-white font-semibold hover:bg-brand-800">{t('site.fair.cta')}</Link>
        </div>
      </section>

      <section id="privacy" className="bg-brand-50 py-16 md:py-24">
        <div className="max-w-[1200px] mx-auto px-4">
          <Reveal><h2 className="text-2xl md:text-[32px] font-bold text-center mb-12">{t('site.privacy.title')}</h2></Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[{ i: KeyRound, k: 'a' }, { i: EyeOff, k: 'b' }, { i: Eye, k: 'c' }, { i: Trash2, k: 'd' }].map((x, i) => (
              <Reveal key={x.k} delay={i * 0.06} className="bg-white rounded-card border border-line p-6 text-center">
                <x.i className="w-7 h-7 text-brand mx-auto" />
                <p className="mt-3 font-medium">{t(`site.privacy.${x.k}`)}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="lenders" className="py-16 md:py-24">
        <div className="max-w-[800px] mx-auto px-4 text-center">
          <Reveal>
            <Banknote className="w-10 h-10 text-brand mx-auto" />
            <h2 className="text-2xl md:text-[32px] font-bold mt-4">{t('site.lenders.title')}</h2>
            <p className="text-ink-2 mt-3">{t('site.lenders.sub')}</p>
            <Link to="/lender/login" className="mt-6 inline-flex h-12 items-center px-6 rounded-xl border border-brand text-brand font-semibold hover:bg-brand-50">{t('site.nav.lenderLogin')}</Link>
          </Reveal>
        </div>
      </section>

      <footer className="bg-brand-900 text-white/80 py-10">
        <div className="max-w-[1200px] mx-auto px-4 text-sm space-y-2">
          <div className="text-white font-bold text-lg">Sahayak<span className="text-brand-100">Fin</span></div>
          <p>{t('site.footer.proto')}</p>
          <p>{t('site.footer.team')}</p>
        </div>
      </footer>
    </div>
  )
}
