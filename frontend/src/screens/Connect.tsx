import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Landmark, Upload } from 'lucide-react'
import Button from '../components/Button'
import Card from '../components/Card'
import Chip from '../components/Chip'
import ErrorBanner from '../components/ErrorBanner'
import TopBar from '../components/TopBar'
import { api } from '../api/endpoints'
import { errCode, errText } from '../lib/errors'
import { useSession } from '../state/session'

const personas = ['ravi', 'sunita', 'arjun', 'meena']

export default function Connect() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { consentId } = useSession()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [needPassword, setNeedPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); setNeedPassword(false); setError(null) }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-line rounded-xl py-6 text-sm text-muted hover:bg-gray-50"
          >
            {file ? file.name : t('screen.connect.uploadHint')}
          </button>
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
          <a className="block text-center text-sm text-brand mt-3 underline" href="/api/v1/demo/samples/ravi.pdf">
            {t('screen.connect.sample')}
          </a>
        </Card>

        <Card>
          <div className="flex items-center gap-2 font-semibold mb-3">
            <Landmark className="w-5 h-5 text-brand" /> {t('screen.connect.aa')}
          </div>
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
