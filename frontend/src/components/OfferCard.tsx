import { useTranslation } from 'react-i18next'
import type { Offer } from '../api/types'
import Button from './Button'
import Card from './Card'
import Chip from './Chip'
import KfsCard from './KfsCard'
import BadWeekTest from './BadWeekTest'
import KfsCostBar from '../charts/KfsCostBar'

export default function OfferCard({
  offer, weekday, onChoose,
}: { offer: Offer; weekday: string; onChoose: () => void }) {
  const { t } = useTranslation()
  const outside = offer.eligible === 'OUTSIDE'
  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <div className="text-base font-semibold">{offer.lender.name}</div>
        {offer.eligible === 'ELIGIBLE' && <Chip variant="green">{t('screen.loans.preApproved')}</Chip>}
        {offer.eligible === 'NEEDS_REVIEW' && <Chip variant="amber">{t('screen.loans.needsReview')}</Chip>}
        {outside && <Chip variant="grey">{t('screen.loans.notAvailable')}</Chip>}
      </div>
      {!outside && <KfsCard offer={offer} weekday={weekday} />}
      {!outside && <KfsCostBar kfs={offer.kfs} />}
      {!outside && <BadWeekTest instalmentPaise={offer.kfs.instalment_paise} />}
      {outside ? (
        <p className="text-sm text-ink-2 mt-1">
          {t(`offerReason.${offer.reason ?? 'OTHER'}`, { defaultValue: t('offerReason.OTHER') })}
        </p>
      ) : (
        <div className="mt-3">
          <Button onClick={onChoose}>{t('screen.loans.choose')}</Button>
        </div>
      )}
    </Card>
  )
}
