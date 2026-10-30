import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Eye, FileUp, LogOut, ShieldCheck, ShieldOff, Share2, Landmark, Wallet, Tags } from 'lucide-react'
import BottomNav from '../components/BottomNav'
import Button from '../components/Button'
import Card from '../components/Card'
import Chip from '../components/Chip'
import ConfirmSheet from '../components/ConfirmSheet'
import ErrorBanner from '../components/ErrorBanner'
import Skeleton from '../components/Skeleton'
import TopBar from '../components/TopBar'
import { useToast } from '../components/Toast'
import { api } from '../api/endpoints'
import type { AuditRow, Consent, LenderInfo } from '../api/types'
import { errText } from '../lib/errors'
import { formatDate } from '../lib/format'
import { useSession } from '../state/session'

const AUDIT_ICON: Record<string, typeof Eye> = {
  VIEW_SCORE_SUMMARY: Eye, SHARED_WITH_LENDER: Share2, SHARE_REVOKED: ShieldOff, CONSENT_CREATED: ShieldCheck,
  CONSENT_REVOKED: ShieldOff, CONSENT_EXPIRED: ShieldOff, STATEMENT_UPLOADED: FileUp, TXN_RECATEGORISED: Tags,
  LOAN_ACCEPTED: Landmark, REPAYMENT_PAID: Wallet,
}

export default function Privacy() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const { logout, latestScore, setLatestScore, user } = useSession()
  const [consent, setConsent] = useState<Consent | null | undefined>(undefined)
  const [lenders, setLenders] = useState<LenderInfo[]>([])
  const [shares, setShares] = useState<Record<string, string>>({})
  const [sharing, setSharing] = useState<string | null>(null)
  const [audit, setAudit] = useState<AuditRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [deleted, setDeleted] = useState<number | null>(null)

  function load() {
    setError(null)
    Promise.all([api.getConsents(), api.getLenders(), api.getAudit()]).then(([consents, rows, events]) => {
      setConsent(consents.find((c) => c.status === 'ACTIVE') ?? consents[0] ?? null)
      setLenders(rows)
      const active = rows as (LenderInfo & { share_id?: string | null })[]
      setShares(Object.fromEntries(active.filter((l) => l.share_id).map((l) => [l.id, l.share_id!])))
      setAudit(events)
    }).catch((e) => setError(errText(t, e)))
  }
  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function revoke() {
    if (!consent) return
    setBusy(true)
    try {
      const r = await api.revokeConsent(consent.id)
      setDeleted(r.deleted.transactions)
      setConsent(r.consent)
      setShares({})
      if (latestScore) setLatestScore({ ...latestScore, consent_revoked: true })
      setConfirm(false)
      api.getAudit().then(setAudit).catch(() => undefined)
    } catch (e) { toast.show(errText(t, e), 'error'); setConfirm(false) } finally { setBusy(false) }
  }

  async function toggle(l: LenderInfo) {
    if (sharing || consent?.status !== 'ACTIVE') return
    setSharing(l.id)
    try {
      if (shares[l.id]) {
        await api.unshare(shares[l.id])
        setShares((s) => { const n = { ...s }; delete n[l.id]; return n })
      } else {
        const r = await api.share(l.id)
        setShares((s) => ({ ...s, [l.id]: r.id }))
      }
      api.getAudit().then(setAudit).catch(() => undefined)
    } catch (e) { toast.show(errText(t, e), 'error') } finally { setSharing(null) }
  }

  async function reset() {
    try { await api.demoReset(); logout(); navigate('/', { replace: true }) }
    catch (e) { toast.show(errText(t, e), 'error') }
  }

  const stamp = (iso: string) => {
    try {
      const d = new Date(iso)
      const loc = i18n.language === 'hi' ? 'hi-IN' : i18n.language === 'mr' ? 'mr-IN' : 'en-IN'
      return `${formatDate(iso, i18n.language)}, ${d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })}`
    } catch { return iso }
  }

  return (
    <div className="flex flex-col min-h-screen pb-16 md:pb-0">
      <TopBar title={t('screen.privacy.title')} />
      <div className="p-4 space-y-4 flex-1">
        {error && <ErrorBanner onRetry={load}>{error}</ErrorBanner>}
        {consent === undefined && !error && <Skeleton className="h-40 w-full" />}
        {consent === null && <p className="text-center text-muted py-6">{t('screen.privacy.noConsent')}</p>}

        {deleted !== null && (
          <Card className="text-center">
            <CheckCircle2 className="w-14 h-14 text-strong mx-auto" />
            <div className="font-semibold mt-2">{t('screen.privacy.deleted', { count: deleted })}</div>
          </Card>
        )}

        {consent && (
          <Card>
            <div className="flex items-center justify-between">
              <div className="font-semibold">{t('screen.privacy.purpose')}</div>
              <Chip variant={consent.status === 'ACTIVE' ? 'green' : 'grey'}>{t(`screen.privacy.status.${consent.status}`)}</Chip>
            </div>
            <div className="text-sm text-muted mt-2">{t('screen.privacy.range', { from: formatDate(consent.range_from, i18n.language), to: formatDate(consent.range_to, i18n.language) })}</div>
            <div className="text-sm text-muted">{t('screen.privacy.expires', { date: formatDate(consent.expires_at, i18n.language) })}</div>
            {consent.status === 'ACTIVE' && (
              <div className="mt-3">
                <Button variant="danger" onClick={() => setConfirm(true)}>{t('screen.privacy.revoke')}</Button>
              </div>
            )}
          </Card>
        )}

        <Card>
          <div className="font-semibold mb-1">{t('screen.privacy.lenders')}</div>
          <p className="text-xs text-muted mb-2">{t('screen.privacy.lendersNote')}</p>
          {lenders.map((l) => (
            <label key={l.id} className="flex items-center justify-between py-2 min-h-[48px]">
              <span className="text-sm">{l.name}</span>
              <input type="checkbox" role="switch" checked={!!shares[l.id]} disabled={!!sharing || consent?.status !== 'ACTIVE'} onChange={() => toggle(l)}
                className="w-11 h-11 accent-teal-700 disabled:opacity-50" aria-label={l.name} />
            </label>
          ))}
        </Card>

        <Card>
          <div className="font-semibold mb-1">{t('screen.privacy.audit')}</div>
          {!audit && <Skeleton className="h-16 w-full" />}
          {audit && audit.length === 0 && <p className="text-sm text-muted">{t('screen.privacy.auditEmpty')}</p>}
          <div className="divide-y divide-line">
            {audit?.map((a, i) => {
              const Icon = AUDIT_ICON[a.action] ?? Eye
              return (
                <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-3 py-2">
                  <Icon className="w-4 h-4 text-brand flex-shrink-0" />
                  <div className="flex-1 min-w-0 text-sm">{t(`audit.${a.action}`, { name: a.actor_name, defaultValue: a.action })}</div>
                  <div className="text-xs text-muted w-full sm:w-auto sm:whitespace-nowrap pl-7 sm:pl-0">{stamp(a.ts)}</div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-muted">{t('account.signedInAs')}</div>
              <div className="font-semibold truncate">{user?.display_name}</div>
              {user?.phone_masked && <div className="text-xs text-muted">{user.phone_masked}</div>}
            </div>
            <button onClick={() => { logout(); navigate('/', { replace: true }) }}
              className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl border border-line text-sm font-semibold hover:bg-slate-50">
              <LogOut className="w-4 h-4" />{t('account.logout')}
            </button>
          </div>
        </Card>

        <button onClick={reset} className="block mx-auto min-h-11 px-4 text-xs text-muted underline py-3">{t('screen.privacy.reset')}</button>
      </div>
      <BottomNav />
      <ConfirmSheet open={confirm} onClose={() => setConfirm(false)} onConfirm={revoke} loading={busy} danger
        title={t('screen.privacy.confirmTitle')} body={t('screen.privacy.confirmBody')} confirmLabel={t('screen.privacy.revokeConfirm')} />
    </div>
  )
}
