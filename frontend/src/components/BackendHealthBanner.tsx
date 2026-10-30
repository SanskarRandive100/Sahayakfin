import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isMockMode } from '../api/client'

export default function BackendHealthBanner() {
  const { t } = useTranslation()
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((value) => value + 1), [])

  useEffect(() => {
    if (isMockMode()) return
    let live = true
    const controllers = new Set<AbortController>()
    async function check() {
      const controller = new AbortController()
      controllers.add(controller)
      const timeout = window.setTimeout(() => controller.abort(), 8000)
      try {
        const response = await fetch('/api/v1/health', { signal: controller.signal, cache: 'no-store' })
        const result = response.ok ? await response.json() : null
        if (live) setFailed(result?.ok !== true)
      } catch {
        if (live) setFailed(true)
      } finally {
        window.clearTimeout(timeout)
        controllers.delete(controller)
      }
    }
    void check()
    const interval = window.setInterval(() => void check(), 15000)
    return () => {
      live = false
      window.clearInterval(interval)
      controllers.forEach((controller) => controller.abort())
    }
  }, [attempt])

  if (!failed || isMockMode()) return null
  return (
    <div data-testid="backend-health-banner" role="alert"
      className="sticky top-0 z-[100] flex w-full items-center justify-center gap-3 bg-red-700 px-4 py-3 text-sm text-white">
      <span>{t('runtime.backendUnavailable', {
        defaultValue: 'Backend not reachable on :8000 — start uvicorn',
      })}</span>
      <button type="button" className="shrink-0 font-semibold underline" onClick={retry}>
        {t('common.retry')}
      </button>
    </div>
  )
}
