import type { TFunction } from 'i18next'

export function errCode(e: unknown): string {
  return (e as { code?: string })?.code ?? 'INTERNAL_ERROR'
}

export function errText(t: TFunction, e: unknown): string {
  const code = errCode(e)
  return t(`error.${code}`, { defaultValue: t('error.generic') })
}
