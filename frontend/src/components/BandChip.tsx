import { useTranslation } from 'react-i18next'
import type { Band } from '../api/types'
import { bandColor } from '../lib/band'

/** Band word on a 12% band tint, with a dot in the band colour (text stays dark for contrast). */
export default function BandChip({ band }: { band: Band }) {
  const { t } = useTranslation()
  const color = bandColor[band]
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-0.5 text-ink"
      style={{ backgroundColor: `${color}1F` }}>
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {t(`band.${band}`)}
    </span>
  )
}
