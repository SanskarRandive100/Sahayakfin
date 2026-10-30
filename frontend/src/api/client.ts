import { mocks } from '../mocks'

export class ApiFailure extends Error {
  code: string
  status: number
  constructor(code: string, message: string, status = 0) {
    super(message)
    this.code = code
    this.status = status
  }
}

const USE_MOCKS = (import.meta.env.VITE_USE_MOCKS as string | undefined) === 'true'

if (USE_MOCKS) console.warn('[SahayakFin] MOCK MODE')

export function isMockMode(): boolean {
  return USE_MOCKS
}

function readToken(): string | null {
  try {
    const raw = localStorage.getItem('sahayakfin.session')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.token ?? null
  } catch {
    return null
  }
}

function clearSessionAndRedirect() {
  try { localStorage.removeItem('sahayakfin.session') } catch { /* ignore */ }
  if (typeof window !== 'undefined') window.location.href = '/login'
}

export async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: { isForm?: boolean } = {},
): Promise<T> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 300))
    const result = mocks(method, path, body)
    if (result instanceof Error) throw result
    return result as T
  }

  const headers: Record<string, string> = {}
  const token = readToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  let payload: BodyInit | undefined
  if (body !== undefined) {
    if (options.isForm) {
      payload = body as FormData
    } else {
      headers['Content-Type'] = 'application/json'
      payload = JSON.stringify(body)
    }
  }

  const res = await fetch(`/api/v1${path}`, { method, headers, body: payload })
  const text = await res.text()
  const json = text ? safeParse(text) : null
  if (!res.ok) {
    const code = json?.error?.code ?? 'INTERNAL_ERROR'
    const message = json?.error?.message ?? 'Something went wrong.'
    if (res.status === 401) clearSessionAndRedirect()
    throw new ApiFailure(code, message, res.status)
  }
  return (json as T) ?? (undefined as unknown as T)
}

function safeParse(text: string): any {
  try { return JSON.parse(text) } catch { return null }
}
