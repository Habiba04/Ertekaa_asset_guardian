import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../AuthContext'
import { agentService } from '../services/agentService'
import { assetService } from '../services/assetService'
import { IconShield, IconGrid, IconList, IconActivity, IconGear, IconInbox, IconLogout, IconKey } from './Icons'
import ChangePasswordModal from './ChangePasswordModal'

const ROLE_LABEL_KEY: Record<string, string> = {
  SUPER_ADMIN: 'sidebar.superAdmin',
  IT_ADMIN: 'sidebar.itAdmin',
  READ_ONLY_AUDITOR: 'sidebar.readOnlyAuditor',
}

function NavItem({
  to, icon, label, badge, onClick,
}: { to: string; icon: React.ReactNode; label: string; badge?: number; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 500,
        textDecoration: 'none',
        color: isActive ? '#0969da' : 'var(--text-body)',
        backgroundColor: isActive ? 'rgba(9,105,218,0.08)' : 'transparent',
        transition: 'background-color 0.15s ease',
      })}
    >
      <span style={{ display: 'flex', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {!!badge && badge > 0 && (
        <span
          style={{
            backgroundColor: '#cf222e',
            color: 'white',
            fontSize: 10.5,
            fontWeight: 700,
            padding: '1px 6px',
            borderRadius: 10,
            minWidth: 18,
            textAlign: 'center',
          }}
        >
          {badge}
        </span>
      )}
    </NavLink>
  )
}

function NavGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.06em',
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        padding: '0 12px',
        marginBottom: 6,
        marginTop: 18,
      }}
    >
      {children}
    </div>
  )
}

interface SidebarProps {
  mobileOpen?: boolean
  onNavigate?: () => void
}

export default function Sidebar({ mobileOpen = false, onNavigate }: SidebarProps) {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)
  const [onlineCount, setOnlineCount] = useState(0)
  const [showChangePassword, setShowChangePassword] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadCounts() {
      try {
        const [counts, assetsResp] = await Promise.all([
          agentService.getStagingCounts(),
          assetService.list({}),
        ])
        if (cancelled) return
        setPendingCount(counts.pending)
        setOnlineCount(assetsResp.assets.filter((a) => a.status === 'online').length)
      } catch {
        // Non-fatal: sidebar badges simply stay at 0 if this fails.
      }
    }
    loadCounts()
    const interval = setInterval(loadCounts, 30000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return (
    <aside
      className={`app-sidebar ${mobileOpen ? 'open' : ''}`}
      style={{
        width: 236,
        flexShrink: 0,
        height: '100vh',
        backgroundColor: 'var(--bg-surface)',
        borderInlineEnd: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
      }}
    >
      <div style={{ padding: '18px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <IconShield size={26} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {t('app.name')}
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
            {t('sidebar.fleetConsole')}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 10px' }}>
        <NavGroupLabel>{t('sidebar.groupMain')}</NavGroupLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <NavItem to="/dashboard" icon={<IconGrid size={16} />} label={t('sidebar.dashboard')} onClick={onNavigate} />
        </div>

        <NavGroupLabel>{t('sidebar.groupData')}</NavGroupLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <NavItem to="/inventory" icon={<IconList size={16} />} label={t('sidebar.inventory')} onClick={onNavigate} />
          {user?.role !== 'READ_ONLY_AUDITOR' && (
            <NavItem
              to="/staging-queue"
              icon={<IconInbox size={16} />}
              label={t('staging.reviewQueue')}
              badge={pendingCount}
              onClick={onNavigate}
            />
          )}
          <NavItem to="/audit-logs" icon={<IconActivity size={16} />} label={t('sidebar.auditLogs')} onClick={onNavigate} />
        </div>

        {user?.role !== 'READ_ONLY_AUDITOR' && (
          <>
            <NavGroupLabel>{t('sidebar.groupSystem')}</NavGroupLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <NavItem to="/settings" icon={<IconGear size={16} />} label={t('sidebar.settings')} onClick={onNavigate} />
            </div>
          </>
        )}
      </div>

      <div style={{ padding: 12, borderTop: '1px solid var(--border-faint)' }}>
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-secondary)',
            padding: '0 4px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#1a7f37' }} />
          {t('sidebar.devicesOnline', { count: onlineCount })}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 4px',
            borderRadius: 6,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              backgroundColor: '#0969da',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {(user?.fullName || '?').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.fullName}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>
              {t(ROLE_LABEL_KEY[user?.role || 'IT_ADMIN'])}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowChangePassword(true)}
            title={t('sidebar.changePassword')}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
              padding: 6,
              borderRadius: 6,
            }}
          >
            <IconKey size={14} />
          </button>
          <button
            type="button"
            onClick={logout}
            title={t('sidebar.signOut')}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
              padding: 6,
              borderRadius: 6,
            }}
          >
            <IconLogout />
          </button>
        </div>
      </div>

      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </aside>
  )
}
