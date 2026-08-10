import { useState, useRef, type FormEvent, type KeyboardEvent, type ClipboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

interface StepOtpProps {
    email: string
    onSubmit: (otp: string) => Promise<void>
    onResend: () => Promise<void>
    onBack: () => void
}

const OTP_LENGTH = 6

export default function StepOtp({ email, onSubmit, onResend, onBack }: StepOtpProps) {
    const { t } = useTranslation()
    const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
    const [loading, setLoading] = useState(false)
    const [resending, setResending] = useState(false)
    const [error, setError] = useState('')
    const [infoMsg, setInfoMsg] = useState('')

    // Refs array to manage focus across inputs
    const inputRefs = useRef<(HTMLInputElement | null)[]>([])

    const handleChange = (index: number, value: string) => {
        // Only accept numeric inputs
        if (value && !/^\d+$/.test(value)) return

        const newDigits = [...otpDigits]
        // Take the last character entered
        newDigits[index] = value.slice(-1)
        setOtpDigits(newDigits)

        // Auto-advance to next input if digit entered
        if (value && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus()
        }
    }

    const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        // Move focus back on Backspace if current box is empty
        if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus()
        }
    }

    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault()
        const pastedData = e.clipboardData.getData('text').trim()

        // Check if pasted text is 6 digits
        if (/^\d{6}$/.test(pastedData)) {
            const digits = pastedData.split('')
            setOtpDigits(digits)
            inputRefs.current[OTP_LENGTH - 1]?.focus()
        }
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')

        const fullOtp = otpDigits.join('')
        if (fullOtp.length < OTP_LENGTH) {
            setError(t('forgotPassword.otpIncomplete', 'Please enter all 6 digits.'))
            return
        }

        setLoading(true)
        try {
            await onSubmit(fullOtp)
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            setError(msg || t('forgotPassword.otpError', 'Invalid or expired OTP.'))
        } finally {
            setLoading(false)
        }
    }

    const handleResend = async () => {
        setError('')
        setInfoMsg('')
        setResending(true)
        try {
            await onResend()
            setOtpDigits(Array(OTP_LENGTH).fill(''))
            inputRefs.current[0]?.focus()
            setInfoMsg(t('forgotPassword.otpResent', 'A new OTP has been sent to your email.'))
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            setError(msg || t('forgotPassword.resendError', 'Failed to resend OTP.'))
        } finally {
            setResending(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {t('forgotPassword.otpInstructions', 'We sent a verification code to')} <strong>{email}</strong>.
                <span style={{ display: 'block', marginTop: 4, fontSize: 11.5, color: 'var(--text-secondary)' }}>
                    {t('forgotPassword.checkSpamNote', '(If you don\'t see it in your inbox, please check your spam/junk folder.)')}
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-body)' }}>
                        {t('forgotPassword.otpLabel', 'Verification OTP')}
                    </label>
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={resending}
                        style={{ border: 'none', background: 'transparent', color: '#0969da', fontSize: 11.5, cursor: 'pointer' }}
                    >
                        {resending ? t('common.loading', 'Resending...') : t('forgotPassword.resendOtp', 'Resend OTP')}
                    </button>
                </div>

                {/* 6 Multi-Box Inputs */}
                <div dir="ltr" style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    {otpDigits.map((digit, index) => (
                        <input
                            key={index}
                            ref={(el) => { inputRefs.current[index] = el }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            onPaste={handlePaste}
                            className="input-base"
                            style={{
                                width: 44,
                                height: 48,
                                textAlign: 'center',
                                fontSize: 18,
                                fontWeight: 700,
                                borderRadius: 8,
                            }}
                            autoFocus={index === 0}
                        />
                    ))}
                </div>
            </div>

            {infoMsg && <div style={{ fontSize: 12, color: '#1a7f37', textAlign: 'center' }}>{infoMsg}</div>}
            {error && <div style={{ fontSize: 12, color: '#cf222e', textAlign: 'center' }}>{error}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                <button type="button" className="btn-ghost" onClick={onBack}>
                    {t('common.back', 'Back')}
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? t('common.loading', 'Verifying...') : t('forgotPassword.verifyOtp', 'Verify OTP')}
                </button>
            </div>
        </form>
    )
}