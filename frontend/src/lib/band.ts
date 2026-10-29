import type { Band } from '../api/types'

export const bandColor: Record<Band, string> = {
  STRONG: '#1a7f37',
  GOOD: '#2da44e',
  FAIR: '#bf8700',
  BUILDING: '#6e7781',
}

export const bandKey: Record<Band, string> = {
  STRONG: 'band.STRONG',
  GOOD: 'band.GOOD',
  FAIR: 'band.FAIR',
  BUILDING: 'band.BUILDING',
}

export const bandTextClass: Record<Band, string> = {
  STRONG: 'text-strong',
  GOOD: 'text-good',
  FAIR: 'text-fair',
  BUILDING: 'text-building',
}
