import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

interface StepResetProps {
    onSubmit: (password: string) => Promise<void>
}

export default function StepReset({ onSubmit }: StepResetProps) {
    const { t } = useTranslation()
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')

        if (newPassword.length < 8) {
            setError(t('changePassword.tooShort', 'Password must be at least 8 characters long.'))
            return
        }
        if (newPassword !== confirmPassword) {
            setError(t('changePassword.mismatch', 'Passwords do not match.'))
            return
        }

        setLoading(true)
        try {
            await onSubmit(newPassword)
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            setError(msg || t('changePassword.genericError', 'Failed to reset password.'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-body)' }}>
                    {t('changePassword.new', 'New Password')}
                </label>
                <input
                    type="password"
                    className="input-base"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoFocus
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-body)' }}>
                    {t('changePassword.confirm', 'Confirm Password')}
                </label>
                <input
                    type="password"
                    className="input-base"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                />
            </div>

            {error && <div style={{ fontSize: 12, color: '#cf222e' }}>{error}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? t('common.loading', 'Resetting...') : t('resetPassword.submit', 'Reset Password')}
                </button>
            </div>
        </form>
    )
}