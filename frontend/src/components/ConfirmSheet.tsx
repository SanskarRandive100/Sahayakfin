import { useTranslation } from 'react-i18next'
import Button from './Button'
import Sheet from './Sheet'

interface ConfirmSheetProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  body: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  loading?: boolean
}

export default function ConfirmSheet({
  open, onClose, onConfirm, title, body, confirmLabel, cancelLabel, danger, loading,
}: ConfirmSheetProps) {
  const { t } = useTranslation()
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="text-base font-semibold mb-2">{title}</div>
      <p className="text-sm text-muted mb-4 leading-relaxed">{body}</p>
      <div className="flex flex-col gap-2">
        <Button
          variant={danger ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel ?? t('common.confirm')}
        </Button>
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          {cancelLabel ?? t('common.cancel')}
        </Button>
      </div>
    </Sheet>
  )
}
