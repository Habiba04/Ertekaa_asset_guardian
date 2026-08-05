import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../AuthContext'
import { authService } from '../services/authService'
import { IconShield } from '../components/Icons'
import LanguageToggle from '../components/LanguageToggle'

export default function SetupWizard() {
  const { t } = useTranslation()
  const { setSession } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (/\s/.test(username)) {
      setError(t('setup.usernameNoSpaces'))
      return
    }
    if (password.length < 8) {
      setError(t('setup.passwordTooShort'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('setup.passwordMismatch'))
      return
    }

    setSubmitting(true)
    try {
      const { token, user } = await authService.initializeSetup({ fullName, email, username, password })
      setSession(token, user)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(message || 'Setup failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-base)',
        position: 'relative',
        padding: 20,
      }}
    >
      <div style={{ position: 'absolute', top: 20, insetInlineEnd: 20 }}>
        <LanguageToggle />
      </div>

      <div
        style={{
          width: 420,
          maxWidth: '100%',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '32px 28px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <IconShield size={40} />
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>{t('setup.title')}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', textAlign: 'center' }}>{t('setup.subtitle')}</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-body)' }}>{t('setup.fullName')}</label>
            <input className="input-base" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoFocus />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-body)' }}>{t('setup.email')}</label>
            <input className="input-base" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-body)' }}>{t('setup.usernameField')}</label>
            <input className="input-base" value={username} onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))} required />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-body)' }}>{t('setup.password')}</label>
            <input className="input-base" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-body)' }}>{t('setup.confirmPassword')}</label>
            <input className="input-base" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>

          {error && <div style={{ fontSize: 12, color: '#cf222e' }}>{error}</div>}

          <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: 8 }} disabled={submitting}>
            {submitting ? t('common.loading') : t('setup.createAccount')}
          </button>
        </form>
      </div>
    </div>
  )
}
