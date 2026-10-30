import { useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FileText, Landmark, Upload, UploadCloud, X } from 'lucide-react'
import Button from '../components/Button'
import Card from '../components/Card'
import Chip from '../components/Chip'
import ErrorBanner from '../components/ErrorBanner'
import TopBar from '../components/TopBar'
import { api } from '../api/endpoints'
import { errCode, errText } from '../lib/errors'
import { useSession } from '../state/session'

const personas = ['ravi', 'sunita', 'arjun', 'meena']
const MAX_BYTES = 5 * 1024 * 1024

function fileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function Connect() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { consentId } = useSession()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [drag, setDrag] = useState(false)
  const [needPassword, setNeedPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function pick(f: File | null) {
    setNeedPassword(false); setPassword(''); setError(null)
    if (f && !/\.(pdf|csv)$/i.test(f.name)) { setFile(null); setError(t('screen.connect.badType')); return }
    if (f && f.size > MAX_BYTES) { setFile(null); setError(t('screen.connect.tooBig')); return }
    setFile(f)
  }

  async function upload() {
    if (!file || !consentId) return
    setLoading(true); setError(null)
    try {
      const res = await api.uploadStatement(file, consentId, password || undefined)
      navigate('/processing', { state: { result: res } })
    } catch (e) {
      if (errCode(e) === 'PDF_PASSWORD_REQUIRED') setNeedPassword(true)
      setError(errText(t, e))
    } finally { setLoading(false) }
  }

  async function aa(persona: string) {
    if (!consentId) return
    setLoading(true); setError(null)
    try {
      const res = await api.aaFetch(consentId, persona)
      navigate('/processing', { state: { result: res } })
    } catch (e) { setError(errText(t, e)) } finally { setLoading(false) }
  }

  if (!consentId) return <Navigate to="/consent" replace />

  return (
    <div>
      <TopBar title={t('screen.connect.title')} />
      <div className="p-4 space-y-4">
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <Card>
          <div className="flex items-center gap-2 font-semibold mb-3">
            <Upload className="w-5 h-5 text-brand" /> {t('screen.connect.upload')}
          </div>
          <input
            ref={fileRef} type="file" accept=".pdf,.csv" className="hidden"
            onChange={(e) => { pick(e.target.files?.[0] ?? null); e.target.value = '' }}
          />
          {file ? (
            <div className="flex items-center gap-3 border border-line rounded-xl p-3">
              <FileText className="w-6 h-6 text-brand flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{file.name}</div>
                <div className="text-xs text-muted">{fileSize(file.size)}</div>
              </div>
              <button type="button" aria-label={t('screen.connect.remove')} title={t('screen.connect.remove')}
                onClick={() => pick(null)}
                className="w-10 h-10 inline-flex items-center justify-center rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
              onDragEnter={(e) => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0] ?? null) }}
              className={`w-full border-2 border-dashed rounded-xl py-8 px-4 text-sm flex flex-col items-center gap-2 transition-colors ${drag ? 'border-brand bg-teal-50 text-brand' : 'border-line text-muted hover:bg-gray-50'}`}
            >
              <UploadCloud className="w-8 h-8" />
              <span className="font-medium">{t('screen.connect.dropHint')}</span>
              <span className="text-xs">{t('screen.connect.dropTypes')}</span>
            </button>
          )}
          {needPassword && (
            <div className="mt-3 fade-in">
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={t('screen.connect.password')}
                className="w-full h-[52px] rounded-xl border border-line px-4"
              />
              <p className="text-xs text-muted mt-1">{t('screen.connect.passwordHint')}</p>
            </div>
          )}
          <div className="mt-3">
            <Button onClick={upload} loading={loading} disabled={!file}>{t('screen.connect.submit')}</Button>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 font-semibold mb-1">
            <Landmark className="w-5 h-5 text-brand" /> {t('screen.connect.aa')}
          </div>
          <p className="text-xs text-muted mb-3">{t('screen.connect.chooseAccount')}</p>
          <div className="flex flex-wrap gap-2">
            {personas.map((p) => (
              <button key={p} onClick={() => aa(p)} disabled={loading} className="disabled:opacity-50">
                <Chip variant="brand" className="px-4 py-2 text-sm capitalize">{p}</Chip>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
