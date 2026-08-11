import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

interface StepEmailProps {
    onSubmit: (email: string) => Promise<void>
    onCancel: () => void
}

export default function StepEmail({ onSubmit, onCancel }: StepEmailProps) {
    const { t } = useTranslation()
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            await onSubmit(email)
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            setError(msg || t('forgotPassword.emailError', 'Failed to send OTP. Please check the email.'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {t('forgotPassword.emailInstructions', 'Enter your registered email address to receive a verification OTP.')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-body)' }}>
                    {t('forgotPassword.emailLabel', 'Email Address')}
                </label>
                <input
                    type="email"
                    className="input-base"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    required
                    autoFocus
                />
            </div>

            {error && <div style={{ fontSize: 12, color: '#cf222e' }}>{error}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <button type="button" className="btn-ghost" onClick={onCancel}>
                    {t('common.cancel', 'Cancel')}
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? t('common.loading', 'Sending...') : t('forgotPassword.sendOtp', 'Send OTP')}
                </button>
            </div>
        </form>
    )
}