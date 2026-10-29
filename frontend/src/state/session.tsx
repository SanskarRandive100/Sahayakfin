import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import i18n from '../i18n'
import type { ScoreResult, User } from '../api/types'

type Lang = 'en' | 'hi' | 'mr'

type SessionState = {
  token: string | null
  user: User | null
  language: Lang | null
  consentId: string | null
  latestScore: ScoreResult | null
  setToken: (t: string | null) => void
  setUser: (u: User | null) => void
  setLanguage: (l: Lang) => void
  setConsentId: (c: string | null) => void
  setLatestScore: (s: ScoreResult | null) => void
  logout: () => void
}

const STORAGE_KEY = 'sahayakfin.session'

type Persisted = Pick<SessionState, 'token' | 'user' | 'language' | 'consentId' | 'latestScore'>

function readStorage(): Partial<Persisted> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function writeStorage(data: Partial<Persisted>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* ignore quota / privacy mode */
  }
}

const SessionContext = createContext<SessionState | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const initial = readStorage()
  const [token, setTokenRaw] = useState<string | null>(initial.token ?? null)
  const [user, setUserRaw] = useState<User | null>(initial.user ?? null)
  const [language, setLanguageRaw] = useState<Lang | null>(initial.language ?? null)
  const [consentId, setConsentIdRaw] = useState<string | null>(initial.consentId ?? null)
  const [latestScore, setLatestScoreRaw] = useState<ScoreResult | null>(initial.latestScore ?? null)

  useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language)
    }
  }, [language])

  useEffect(() => {
    writeStorage({ token, user, language, consentId, latestScore })
  }, [token, user, language, consentId, latestScore])

  const setLanguage = useCallback((l: Lang) => {
    setLanguageRaw(l)
    try { localStorage.setItem('lang', l) } catch { /* ignore */ }
    i18n.changeLanguage(l)
  }, [])

  const logout = useCallback(() => {
    setTokenRaw(null)
    setUserRaw(null)
    setConsentIdRaw(null)
    setLatestScoreRaw(null)
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  }, [])

  const value = useMemo<SessionState>(() => ({
    token,
    user,
    language,
    consentId,
    latestScore,
    setToken: setTokenRaw,
    setUser: setUserRaw,
    setLanguage,
    setConsentId: setConsentIdRaw,
    setLatestScore: setLatestScoreRaw,
    logout,
  }), [token, user, language, consentId, latestScore, setLanguage, logout])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside SessionProvider')
  return ctx
}
