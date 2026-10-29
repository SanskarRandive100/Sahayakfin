import type { Band } from '../api/types'

export const bandColor: Record<Band, string> = {
  STRONG: '#1A7F37',
  GOOD: '#2DA44E',
  FAIR: '#BF8700',
  BUILDING: '#6E7781',
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
