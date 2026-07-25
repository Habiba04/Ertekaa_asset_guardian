import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { authService } from '../services/authService'
import type { AdminUser } from '../types'
import { IconX, IconCheck } from './Icons'
import Portal from './Portal'

interface ResetPasswordModalProps {
  admin: AdminUser
  onClose: () => void
}

export default function ResetPasswordModal({ admin, onClose }: ResetPasswordModalProps) {
  const { t } = useTranslation()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 8) {
      setError(t('changePassword.tooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t('changePassword.mismatch'))
      return
    }

    setSubmitting(true)
    try {
      await authService.resetAdminPassword(admin.id, newPassword)
      setSuccess(true)
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(message || t('changePassword.genericError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Portal>
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(28,33,40,0.4)',
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 12,
          width: 400,
          maxWidth: '100%',
          boxShadow: '0 20px 48px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text-primary)' }}>{t('resetPassword.title')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{admin.fullName} · {admin.email}</div>
          </div>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <IconX size={18} />
          </button>
        </div>

        {success ? (
          <div style={{ padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: 'rgba(26,127,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconCheck size={20} color="#1a7f37" />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{t('resetPassword.successTitle')}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{t('resetPassword.successBody')}</div>
            <button type="button" className="btn-primary" onClick={onClose} style={{ marginTop: 6 }}>
              {t('common.close')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('resetPassword.warning')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-body)' }}>{t('changePassword.new')}</label>
              <input className="input-base" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoFocus />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-body)' }}>{t('changePassword.confirm')}</label>
              <input className="input-base" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>

            {error && <div style={{ fontSize: 12, color: '#cf222e' }}>{error}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <button type="button" className="btn-ghost" onClick={onClose}>
                {t('changePassword.cancel')}
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? t('common.loading') : t('resetPassword.submit')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
    </Portal>
  )
}
