import { useTranslation } from 'react-i18next'
import { IconAlertTriangle } from './Icons'
import Portal from './Portal'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  submitting?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  title, message, confirmLabel, cancelLabel, danger = true, submitting = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation()

  return (
    <Portal>
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(28,33,40,0.45)',
        zIndex: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 12,
          width: 400,
          maxWidth: '100%',
          padding: 24,
          boxShadow: '0 20px 48px rgba(0,0,0,0.22)',
        }}
      >
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              backgroundColor: danger ? 'rgba(207,34,46,0.1)' : 'rgba(154,103,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconAlertTriangle size={18} color={danger ? '#cf222e' : '#9a6700'} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>{message}</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
          <button type="button" className="btn-ghost" onClick={onCancel} disabled={submitting}>
            {cancelLabel || t('confirmDialog.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            style={{
              backgroundColor: danger ? '#cf222e' : '#9a6700',
              color: 'white',
              fontSize: 13,
              fontWeight: 500,
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? t('common.loading') : confirmLabel || t('confirmDialog.confirm')}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  )
}
