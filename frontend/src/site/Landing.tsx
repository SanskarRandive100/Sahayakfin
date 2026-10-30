import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, BadgeCheck, Banknote, Building2, Eye, EyeOff, FileText, KeyRound, Landmark, PiggyBank, Receipt, ShieldCheck, Trash2, TrendingUp, Wallet,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../api/endpoints'
import type { FairnessReport } from '../api/types'
import LanguageSwitch from '../components/LanguageSwitch'
import BandChip from '../components/BandChip'
import ScoreGauge from '../components/ScoreGauge'
import ErrorBanner from '../components/ErrorBanner'
import Skeleton from '../components/Skeleton'
import { bandColor } from '../lib/band'
import { useSession } from '../state/session'
import { Marquee, NumberTicker, Reveal } from './ui'

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
    <div className="text-ink">
      <header className="sticky top-0 z-30 glass-bar border-b border-white/70 shadow-[0_1px_0_rgba(15,35,60,0.06)]">
        <div className="max-w-[1160px] mx-auto min-h-16 py-2 px-4 flex flex-wrap items-center gap-3 lg:gap-6">
          <Link to="/" className="text-xl font-semibold min-h-11 inline-flex items-center gap-2 shrink-0"><span className="w-2.5 h-2.5 rounded-sm bg-mark" aria-hidden />Sahayak<span className="text-brand">Fin</span></Link>
          <nav className="hidden lg:flex gap-6 text-sm text-ink-2" aria-label="Sections">
            <a href="#how" className="inline-flex min-h-11 items-center hover:text-ink">{t('site.nav.how')}</a>
            <Link to="/fairness" className="inline-flex min-h-11 items-center hover:text-ink">{t('site.nav.fairness')}</Link>
            <a href="#privacy" className="inline-flex min-h-11 items-center hover:text-ink">{t('site.nav.privacy')}</a>
            <a href="#lenders" className="inline-flex min-h-11 items-center hover:text-ink">{t('site.nav.lenders')}</a>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <LanguageSwitch />
            <Link to="/lender/login" className="hidden lg:inline-flex min-h-11 items-center px-3 rounded-btn text-sm font-medium text-ink-2 hover:bg-white/70 hover:text-ink">{t('site.nav.lenderLogin')}</Link>
            {token ? (
              <>
                <button onClick={() => { logout(); navigate('/', { replace: true }) }}
                  className="hidden sm:inline-flex min-h-11 items-center px-3 rounded-btn text-sm font-medium text-ink-2 hover:bg-white/70 hover:text-ink">
                  {t('account.logout')}
                </button>
                <Link to={user?.role === 'LENDER' ? '/lender' : '/app/dashboard'} className="inline-flex min-h-11 items-center px-4 rounded-btn bg-brand text-white text-sm font-medium shadow-btn transition-colors duration-150 hover:bg-brand-800">
                  {user?.role === 'LENDER' ? t('nav12.lenderDashboard') : t('nav12.myDashboard')}
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="inline-flex min-h-11 items-center px-3 rounded-btn text-sm font-medium text-ink-2 hover:bg-white/70 hover:text-ink">{t('account.login')}</Link>
                <Link to="/language" className="hidden sm:inline-flex min-h-11 items-center px-4 rounded-btn bg-brand text-white text-sm font-medium shadow-btn transition-colors duration-150 hover:bg-brand-800">{t('site.nav.cta')}</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {error && <div className="max-w-[1160px] mx-auto p-4" role="status"><ErrorBanner onRetry={load}>{t('backend.unreachable')}</ErrorBanner></div>}
      <section className="bg-transparent">
        <div className="max-w-[1160px] mx-auto px-4 py-16 md:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <Reveal className="text-center lg:text-left">
            <h1 className="font-display text-[36px] leading-[44px] md:text-[56px] md:leading-[64px] text-ink">
              {t('site.hero.h1a')} <span className="text-brand">{t('site.hero.h1b')}</span>
            </h1>
            <p className="mt-6 text-lg text-ink-2 max-w-xl mx-auto lg:mx-0">{t('site.hero.sub')}</p>
            <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-3">
              <Link to="/language" className="inline-flex h-12 items-center gap-2 px-6 rounded-btn bg-brand text-white font-semibold shadow-btn transition-colors duration-150 hover:bg-brand-800">
                {t('site.hero.cta1')} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/fairness" className="inline-flex h-12 items-center px-6 rounded-btn border border-line bg-white/70 text-ink font-semibold transition-colors duration-150 hover:bg-white">{t('site.hero.cta2')}</Link>
            </div>
            <ul className="mt-8 flex flex-wrap justify-center lg:justify-start gap-2">
              {[{ k: 'kfs', i: FileText }, { k: 'consent', i: ShieldCheck }, { k: 'cibil', i: BadgeCheck }].map((c) => (
                <li key={c.k} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white/70 border border-white/80 text-sm text-ink-2">
                  <c.i className="w-4 h-4 text-brand" strokeWidth={1.75} aria-hidden />{t(`site.hero.trust.${c.k}`)}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.1} className="max-w-sm w-full mx-auto">
            <div className="relative pt-6 pr-6 sm:pt-8 sm:pr-8">
              <div aria-hidden className="absolute top-0 right-0 bottom-8 left-8 glass rounded-card" />
              <div className="relative glass rounded-card shadow-pop p-6 flex flex-col items-center text-ink">
                {ravi ? <ScoreGauge score={ravi.score} band={ravi.band} showBand={false} /> : <Skeleton className="h-48 w-48 rounded-full" />}
                {ravi && <div className="mt-3"><BandChip band={ravi.band} /></div>}
                <div className="mt-4 text-sm text-ink-2 text-center">{t('site.hero.card')}</div>
              </div>
            </div>
          </Reveal>
        </div>
        <div className="border-t border-white/60 py-5"><Marquee items={['UPI', 'NEFT', 'IMPS', 'Account Aggregator', 'PDF', 'CSV', 'UPI', 'NEFT', 'IMPS']} /></div>
      </section>

      <section className="border-t border-white/60 py-16 md:py-24">
        <div className="max-w-[1160px] mx-auto px-4 grid md:grid-cols-2 gap-8">
          <Reveal>
            <div className="font-display text-5xl text-ink"><NumberTicker value={7.7} decimals={1} /> M → <NumberTicker value={23.5} decimals={1} /> M</div>
            <p className="mt-3 text-ink-2">{t('site.problem.gig')}</p>
            <p className="text-xs text-muted mt-1">{t('site.problem.source')}</p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="font-display text-5xl text-ink">{t('site.problem.most')}</div>
            <p className="mt-3 text-ink-2">{t('site.problem.nohistory')}</p>
          </Reveal>
        </div>
      </section>

      <section id="how" className="border-t border-white/60 py-16 md:py-24">
        <div className="max-w-[1160px] mx-auto px-4">
          <Reveal><h2 className="text-2xl md:text-[32px] font-semibold mb-12">{t('site.how.title')}</h2></Reveal>
          <Reveal>
            <ol className="glass rounded-card p-6 md:p-8 grid gap-8 md:grid-cols-3 md:gap-6">
              {[
                { icon: Landmark, k: 'one' }, { icon: ShieldCheck, k: 'two' }, { icon: Building2, k: 'three' },
              ].map((s, i) => (
                <li key={s.k}>
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 flex-shrink-0 rounded-full bg-brand text-white font-semibold flex items-center justify-center">{i + 1}</span>
                    <s.icon className="w-5 h-5 text-ink-2 flex-shrink-0" strokeWidth={1.75} aria-hidden />
                    {i < 2 && <span aria-hidden className="hidden md:block flex-1 h-px bg-brand/30" />}
                  </div>
                  <h3 className="text-lg font-semibold mt-4">{t(`site.how.${s.k}.t`)}</h3>
                  <p className="text-sm text-ink-2 mt-1">{t(`site.how.${s.k}.d`)}</p>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-white/60 py-16 md:py-24">
        <div className="max-w-[1160px] mx-auto px-4">
          <Reveal><h2 className="text-2xl md:text-[32px] font-semibold mb-12">{t('site.pillars.title')}</h2></Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p, i) => (
              <Reveal key={p.k} delay={i * 0.06} className={`glass rounded-card p-6 ${p.span}`}>
                <p.icon className="w-6 h-6 text-brand" strokeWidth={1.75} />
                <h3 className="text-lg font-semibold mt-3">{t(`site.pillars.${p.k}.t`)}</h3>
                <p className="text-sm text-ink-2 mt-1">{t(`site.pillars.${p.k}.d`)}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/60 py-16 md:py-24">
        <div className="max-w-[1000px] mx-auto px-4">
          <Reveal><h2 className="text-2xl md:text-[32px] font-semibold">{t('site.fair.title')}</h2></Reveal>
          {!report && !error && <Skeleton className="h-40 w-full mt-10" />}
          <div className="grid grid-cols-2 gap-4 mt-10">
            {personas.map((p) => (
              <Reveal key={p.name} className="glass rounded-card p-6">
                <div className="text-sm text-muted">{firstName(p.name)} · ₹{Math.round(p.monthly_income_paise / 100000)}k</div>
                <div className="font-display text-6xl mt-2" style={{ color: bandColor[p.band] }}>{p.score}</div>
                <div className="text-sm font-semibold" style={{ color: bandColor[p.band] }}>{t(`band.${p.band}`)}</div>
              </Reveal>
            ))}
          </div>
          <p className="mt-8 text-lg text-ink-2">{t('site.fair.line')}</p>
          <Link to="/fairness" className="mt-6 inline-flex h-12 items-center px-6 rounded-btn bg-brand text-white font-semibold shadow-btn transition-colors duration-150 hover:bg-brand-800">{t('site.fair.cta')}</Link>
        </div>
      </section>

      <section id="privacy" className="border-t border-white/60 py-16 md:py-24">
        <div className="max-w-[1160px] mx-auto px-4">
          <Reveal><h2 className="text-2xl md:text-[32px] font-semibold mb-12">{t('site.privacy.title')}</h2></Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[{ i: KeyRound, k: 'a' }, { i: EyeOff, k: 'b' }, { i: Eye, k: 'c' }, { i: Trash2, k: 'd' }].map((x, i) => (
              <Reveal key={x.k} delay={i * 0.06} className="glass rounded-card p-6">
                <x.i className="w-6 h-6 text-brand" strokeWidth={1.75} />
                <p className="mt-3 font-medium">{t(`site.privacy.${x.k}`)}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="lenders" className="border-t border-white/60 py-16 md:py-24">
        <div className="max-w-[800px] mx-auto px-4">
          <Reveal>
            <Banknote className="w-8 h-8 text-ink-2" strokeWidth={1.75} />
            <h2 className="text-2xl md:text-[32px] font-semibold mt-4">{t('site.lenders.title')}</h2>
            <p className="text-ink-2 mt-3">{t('site.lenders.sub')}</p>
            <Link to="/lender/login" className="mt-6 inline-flex h-12 items-center px-6 rounded-btn border border-line bg-white/70 text-brand font-semibold transition-colors duration-150 hover:bg-white">{t('site.nav.lenderLogin')}</Link>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-white/60 py-6">
        <div className="max-w-[1160px] mx-auto px-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-sm text-ink-2">
          <p>{t('site.footer.proto')}</p>
          <p className="text-muted">{t('site.footer.team')}</p>
        </div>
      </footer>
    </div>
  )
}
