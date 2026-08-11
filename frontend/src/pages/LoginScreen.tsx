import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../AuthContext'
import { IconShield } from '../components/Icons'
import LanguageToggle from '../components/LanguageToggle'
import ForgotPasswordModal from '../components/ForgotPassword' // Import grouped modal

export default function LoginScreen() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  // State for forgot password modal visibility
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(username, password)
      navigate('/dashboard', { replace: true })
    } catch {
      setError(t('login.invalidCredentials'))
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
          width: 380,
          maxWidth: '100%',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '32px 28px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <IconShield size={40} />
          <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--text-primary)' }}>{t('app.name')}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{t('app.tagline')}</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-body)' }}>{t('login.username')}</label>
            <input
              className="input-base"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('login.usernamePlaceholder') ?? ''}
              required
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-body)' }}>{t('login.password')}</label>
              <span
                role="button"
                tabIndex={0}
                onClick={() => setShowForgotPassword(true)}
                onKeyDown={(e) => e.key === 'Enter' && setShowForgotPassword(true)}
                style={{ fontSize: 11.5, color: '#0969da', cursor: 'pointer' }}
              >
                {t('login.forgotPassword')}
              </span>
            </div>
            <input className="input-base" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          {error && <div style={{ fontSize: 12, color: '#cf222e' }}>{error}</div>}

          <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: 8 }} disabled={submitting}>
            {submitting ? t('login.authenticating') : t('login.accessConsole')}
          </button>
        </form>

        <div style={{ marginTop: 20, padding: '12px 14px', backgroundColor: 'var(--bg-elevated)', borderRadius: 8 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-primary)' }}>{t('login.restrictedTitle')}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>{t('login.restrictedBody')}</div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 20, fontSize: 11, color: 'var(--text-secondary)' }}>{t('login.footer')}</div>

      {showForgotPassword && (
        <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />
      )}
    </div>
  )
}