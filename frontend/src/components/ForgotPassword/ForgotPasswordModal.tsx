import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { authService } from '../../services/authService'
import { IconX, IconCheck } from '../Icons'
import Portal from '../Portal'
import StepEmail from './StepEmail'
import StepOtp from './StepOtp'
import StepReset from './StepReset'

type Step = 'EMAIL' | 'OTP' | 'RESET' | 'SUCCESS'

interface ForgotPasswordModalProps {
    onClose: () => void
}

export default function ForgotPasswordModal({ onClose }: ForgotPasswordModalProps) {
    const { t } = useTranslation()
    const [step, setStep] = useState<Step>('EMAIL')
    const [email, setEmail] = useState('')
    const [resetToken, setResetToken] = useState('')

    // 1. Request OTP via authService
    const handleSendOtp = async (targetEmail: string) => {
        setEmail(targetEmail)
        // Expecting authService.requestPasswordOtp(targetEmail)
        await authService.requestPasswordOtp(targetEmail)
        setStep('OTP')
    }

    // 2. Verify OTP via authService
    const handleVerifyOtp = async (otp: string) => {
        // Expecting authService.verifyPasswordOtp(email, otp) -> returns reset token
        const res = await authService.verifyPasswordOtp(email, otp)
        if (res?.resetToken) {
            setResetToken(res.resetToken)
        }
        setStep('RESET')
    }

    // 3. Reset Password via authService
    const handleResetPassword = async (newPassword: string) => {
        // Expecting authService.resetPasswordWithToken({ email, resetToken, newPassword })
        await authService.resetPasswordWithToken({ email, resetToken, newPassword })
        setStep('SUCCESS')
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
                onClick={onClose}
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderRadius: 12,
                        width: 400,
                        maxWidth: '100%',
                        boxShadow: '0 20px 48px rgba(0,0,0,0.18)',
                        overflow: 'hidden',
                    }}
                >
                    {/* Header */}
                    <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {t('forgotPassword.title', 'Forgot Password')}
                        </div>
                        <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                            <IconX size={18} />
                        </button>
                    </div>

                    {/* Body */}
                    <div style={{ padding: 22 }}>
                        {step === 'EMAIL' && (
                            <StepEmail onSubmit={handleSendOtp} onCancel={onClose} />
                        )}

                        {step === 'OTP' && (
                            <StepOtp
                                email={email}
                                onSubmit={handleVerifyOtp}
                                onResend={() => handleSendOtp(email)}
                                onBack={() => setStep('EMAIL')}
                            />
                        )}

                        {step === 'RESET' && (
                            <StepReset onSubmit={handleResetPassword} />
                        )}

                        {step === 'SUCCESS' && (
                            <div style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
                                <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: 'rgba(26,127,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <IconCheck size={20} color="#1a7f37" />
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {t('resetPassword.successTitle', 'Password Reset Successful')}
                                </div>
                                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                                    {t('resetPassword.successBody', 'Your password has been changed successfully. You can now log in with your new credentials.')}
                                </div>
                                <button type="button" className="btn-primary" onClick={onClose} style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}>
                                    {t('common.close', 'Close')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Portal>
    )
}