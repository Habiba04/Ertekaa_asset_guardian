import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { authService } from '../services/authService'
import { settingsService } from '../services/settingsService'
import { agentService } from '../services/agentService'
import { useAuth } from '../AuthContext'
import type { AdminUser, DropdownState, DropdownValue, StagingCounts, UserRole } from '../types'
import { IconPlus, IconTrash, IconDownload, IconCheck, IconKey } from '../components/Icons'
import ResetPasswordModal from '../components/ResetPasswordModal'
import ConfirmDialog from '../components/ConfirmDialog'
import { useMediaQuery } from '../hooks/useMediaQuery'

const ROLES: UserRole[] = ['SUPER_ADMIN', 'IT_ADMIN', 'READ_ONLY_AUDITOR']
const EMPTY_DROPDOWNS: DropdownState = { departments: [], locations: [] }
const DEFAULT_SHARE_PATH = '\\\\YOUR-SERVER\\YOUR-SHARE\\asset-guardian'

export default function SettingsScreen() {
  const { t } = useTranslation()
  const isTablet = useMediaQuery('(max-width: 860px)')
  const { user: currentUser } = useAuth()
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [dropdowns, setDropdowns] = useState<DropdownState>(EMPTY_DROPDOWNS)
  const [counts, setCounts] = useState<StagingCounts>({ enrolled: 0, pending: 0, failed: 0 })
  const [showAddAdmin, setShowAddAdmin] = useState(false)
  const [newAdmin, setNewAdmin] = useState({ fullName: '', email: '', username: '', password: '', role: 'IT_ADMIN' as UserRole })
  const [addAdminError, setAddAdminError] = useState('')
  const [newDept, setNewDept] = useState('')
  const [newLoc, setNewLoc] = useState('')
  const [copied, setCopied] = useState(false)
  const [resettingAdmin, setResettingAdmin] = useState<AdminUser | null>(null)
  const [sharePath, setSharePath] = useState(() => localStorage.getItem('ag_deploy_share_path') || DEFAULT_SHARE_PATH)
  const [revokingAdmin, setRevokingAdmin] = useState<AdminUser | null>(null)
  const [revoking, setRevoking] = useState(false)
  const [deletingDropdown, setDeletingDropdown] = useState<{ type: 'departments' | 'locations'; entry: DropdownValue } | null>(null)
  const [deletingDropdownBusy, setDeletingDropdownBusy] = useState(false)
  const [toast, setToast] = useState('')

  const loadAll = async () => {
    const [adminsResp, dropdownsResp, countsResp] = await Promise.all([
      authService.listAdmins(),
      settingsService.listDropdowns(),
      agentService.getStagingCounts(),
    ])
    setAdmins(adminsResp.admins)
    setDropdowns(dropdownsResp)
    setCounts(countsResp)
  }

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    if(!toast) return
    const timeout = setTimeout(() => setToast(''), 3200)
    return () => clearTimeout(timeout)
  }, [toast])
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const handleAddAdmin = async () => {
    setAddAdminError('')
    if (!newAdmin.fullName.trim() || !newAdmin.email.trim() || !newAdmin.username.trim() || !newAdmin.password) {
      setAddAdminError(t('settings.allFieldsRequired'))
      return
    }
    if (/\s/.test(newAdmin.username)) {
      setAddAdminError(t('settings.usernameNoSpaces'))
      return
    }
    if (!EMAIL_REGEX.test(newAdmin.email.trim())) {
      setAddAdminError(t('settings.emailInvalid'))
      return
    }
    if (newAdmin.password.length < 8) {
      setAddAdminError(t('settings.passwordTooShort'))
      return
    }
    try {
      await authService.createAdmin(newAdmin)
      setNewAdmin({ fullName: '', email: '', username: '', password: '', role: 'IT_ADMIN' })
      setShowAddAdmin(false)
      loadAll()
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setAddAdminError(message || t('settings.addAdminFailed'))
    }
    setToast(t('settings.newAdminSuccess'))
  }

  const handleRoleChange = async (id: string, role: UserRole) => {
    await authService.updateAdminRole(id, role)
    setToast(t('settings.roleChangedSuccess'))
    loadAll()
  }

  const handleRevoke = async () => {
    if (!revokingAdmin) return
    setRevoking(true)
    try {
      await authService.revokeAdmin(revokingAdmin.id)
      setRevokingAdmin(null)
      await loadAll()
    } finally {
      setRevoking(false)
    }
    setToast(t('settings.revokeAdminSuccess'))
  }

  const handleAddDropdown = async (type: 'departments' | 'locations') => {
    const value = type === 'departments' ? newDept : newLoc
    if (!value.trim()) return
    await settingsService.addDropdownValue(type, value.trim())
    if (type === 'departments') setNewDept('')
    else setNewLoc('')
    setToast(t('settings.addDropdownSuccess'))
    loadAll()
  }

  const handleDeleteDropdown = async () => {
    if (!deletingDropdown) return
    setDeletingDropdownBusy(true)
    try {
      await settingsService.deleteDropdownValue(deletingDropdown.type, deletingDropdown.entry.id)
      setDeletingDropdown(null)
      await loadAll()
    } finally {
      setDeletingDropdownBusy(false)
    }
    setToast(t('settings.deleteDropdownSuccess'))
  }

  const gpoCommand = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& { ${sharePath}\\install-agent.bat }"`

  const handleSharePathChange = (value: string) => {
    setSharePath(value)
    localStorage.setItem('ag_deploy_share_path', value)
  }

  const handleCopyGpo = () => {
    navigator.clipboard.writeText(gpoCommand)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="page-padding">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{t('settings.title')}</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>{t('settings.subtitle')}</div>
      </div>
      {toast && (
        <div style={{ backgroundColor: 'rgba(26,127,55,0.1)', color: '#1a7f37', fontSize: 12.5, fontWeight: 500, padding: '8px 14px', borderRadius: 8, marginBottom: 14, display: 'flex', alignItems:"center", gap:6}}>
          <IconCheck size={13} color="#1a7f37" /> 
          {toast} 
        </div>
      )}

      {/* ── IT Administrator Accounts ─────────────────────────── */}
      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-primary)' }}>{t('settings.adminModuleTitle')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{t('settings.adminModuleSub')}</div>
          </div>
          {currentUser?.role === 'SUPER_ADMIN' && (
            <button type="button" className="btn-primary" onClick={() => setShowAddAdmin((v) => !v)}>
              <IconPlus size={13} color="white" />
              {t('settings.addAdministrator')}
            </button>
          )}
        </div>

        {showAddAdmin && (
          <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : 'repeat(5, 1fr)', gap: 10, marginBottom: 14, padding: 14, backgroundColor: 'var(--bg-elevated)', borderRadius: 8 }}>
            <input className="input-base" placeholder={t('settings.fullName') ?? ''} value={newAdmin.fullName} onChange={(e) => setNewAdmin((p) => ({ ...p, fullName: e.target.value }))} />
            <input className="input-base" type="email" placeholder={t('settings.email') ?? ''} value={newAdmin.email} onChange={(e) => setNewAdmin((p) => ({ ...p, email: e.target.value }))} />
            <input className="input-base" placeholder={t('settings.username') ?? ''} value={newAdmin.username} onChange={(e) => setNewAdmin((p) => ({ ...p, username: e.target.value.replace(/\s/g, '') }))} />
            <input className="input-base" type="password" placeholder={t('settings.password') ?? ''} value={newAdmin.password} onChange={(e) => setNewAdmin((p) => ({ ...p, password: e.target.value }))} />
            <select className="input-base" value={newAdmin.role} onChange={(e) => setNewAdmin((p) => ({ ...p, role: e.target.value as UserRole }))}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`settings.role${r === 'SUPER_ADMIN' ? 'SuperAdmin' : r === 'IT_ADMIN' ? 'ItAdmin' : 'ReadOnly'}`)}
                </option>
              ))}
            </select>
            {addAdminError && <div style={{ gridColumn: '1 / -1', fontSize: 11.5, color: '#cf222e' }}>{addAdminError}</div>}
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn-ghost" onClick={() => { setShowAddAdmin(false); setAddAdminError('') }}>
                {t('settings.cancel')}
              </button>
              {(currentUser?.role !== 'IT_ADMIN' &&
                <button type="button" className="btn-primary" onClick={handleAddAdmin}>
                  {t('settings.addAdministrator')}
                </button>
              )}
            </div>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 520 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '8px 10px', textAlign: 'start', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('settings.fullName')}</th>
                <th style={{ padding: '8px 10px', textAlign: 'start', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('settings.email')}</th>
                <th style={{ padding: '8px 10px', textAlign: 'start', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('settings.role')}</th>
                {(currentUser?.role !== 'IT_ADMIN' &&
                  <th style={{ padding: '8px 10px', textAlign: 'start', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('common.actions')}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id} style={{ borderBottom: '1px solid var(--border-faint)' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-primary)' }}>{admin.fullName}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--text-body)' }}>{admin.email}</td>
                  <td style={{ padding: '8px 10px' }}>
                    {currentUser?.role === 'SUPER_ADMIN' && admin.id !== currentUser.id ? (
                      <select className="input-base" style={{ padding: '4px 8px', width: 'auto' }} value={admin.role} onChange={(e) => handleRoleChange(admin.id, e.target.value as UserRole)}>
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {t(`settings.role${r === 'SUPER_ADMIN' ? 'SuperAdmin' : r === 'IT_ADMIN' ? 'ItAdmin' : 'ReadOnly'}`)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      t(`settings.role${admin.role === 'SUPER_ADMIN' ? 'SuperAdmin' : admin.role === 'IT_ADMIN' ? 'ItAdmin' : 'ReadOnly'}`)
                    )}
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {currentUser?.role === 'SUPER_ADMIN' && (
                        <button type="button" className="btn-ghost" style={{ padding: '4px 8px', fontSize: 11.5 }} onClick={() => setResettingAdmin(admin)}>
                          <IconKey size={11} /> {t('settings.resetPassword')}
                        </button>
                      )}
                      {currentUser?.role === 'SUPER_ADMIN' && admin.id !== currentUser.id && (
                        <button type="button" className="btn-danger" onClick={() => setRevokingAdmin(admin)}>
                          <IconTrash size={11} /> {t('settings.remove')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Managed Dropdown Values ────────────────────────────── */}
      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 18 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-primary)' }}>{t('settings.dropdownsTitle')}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{t('settings.dropdownsSub')}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{t('settings.departments')}</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <input className="input-base" placeholder={t('settings.newDepartmentPlaceholder') ?? ''} value={newDept} onChange={(e) => setNewDept(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddDropdown('departments')} />
              <button type="button" className="btn-ghost" onClick={() => handleAddDropdown('departments')}>
                <IconPlus size={12} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
              {dropdowns.departments.map((d) => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: 'var(--bg-elevated)', borderRadius: 6, fontSize: 12.5 }}>
                  <span>{d.value}</span>
                  <button type="button" onClick={() => setDeletingDropdown({ type: 'departments', entry: d })} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    <IconTrash size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{t('settings.locations')}</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <input className="input-base" placeholder={t('settings.newLocationPlaceholder') ?? ''} value={newLoc} onChange={(e) => setNewLoc(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddDropdown('locations')} />
              <button type="button" className="btn-ghost" onClick={() => handleAddDropdown('locations')}>
                <IconPlus size={12} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
              {dropdowns.locations.map((l) => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: 'var(--bg-elevated)', borderRadius: 6, fontSize: 12.5 }}>
                  <span>{l.value}</span>
                  <button type="button" onClick={() => setDeletingDropdown({ type: 'locations', entry: l })} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    <IconTrash size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Agent Deployment Hub ───────────────────────────────── */}
      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-primary)' }}>{t('settings.agentHubTitle')}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{t('settings.agentHubSub')}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
          <div style={{ backgroundColor: 'rgba(26,127,55,0.06)', borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1a7f37' }}>{counts.enrolled}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{t('settings.enrolled')}</div>
          </div>
          <div style={{ backgroundColor: 'rgba(154,103,0,0.06)', borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#9a6700' }}>{counts.pending}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{t('settings.pending')}</div>
          </div>
          <div style={{ backgroundColor: 'rgba(207,34,46,0.06)', borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#cf222e' }}>{counts.failed}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{t('settings.failed')}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{t('settings.agentVersion')}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>{t('settings.agentPlatform')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-body)', marginTop: 8 }}>{t('settings.agentDescription')}</div>
          </div>
          <a href="/downloads/tracker-agent.ps1" download className="btn-primary" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <IconDownload size={13} color="white" />
            {t('settings.downloadScript')}
          </a>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 6 }}>
            {t('settings.deployShareLabel')}
          </div>
          <input
            className="input-base ltr-always"
            style={{ marginBottom: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
            value={sharePath}
            onChange={(e) => handleSharePathChange(e.target.value)}
            placeholder={DEFAULT_SHARE_PATH}
          />
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 14 }}>
            {t('settings.deployShareHint')}
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 6 }}>
            {t('settings.gpoCommand')}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <code
              className="ltr-always"
              style={{
                flex: 1,
                minWidth: 220,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11.5,
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '8px 12px',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                color: 'var(--text-body)',
              }}
            >
              {gpoCommand}
            </code>
            <button type="button" className="btn-ghost" onClick={handleCopyGpo}>
              {copied ? <IconCheck size={13} color="#1a7f37" /> : null}
              {copied ? t('settings.copiedCmd') : t('settings.copyInstallCmd')}
            </button>
          </div>
        </div>
      </div>

      {resettingAdmin && <ResetPasswordModal admin={resettingAdmin} onClose={() => setResettingAdmin(null)} />}

      {revokingAdmin && (
        <ConfirmDialog
          title={t('settings.confirmRevokeTitle')}
          message={t('settings.confirmRevokeMessage', { name: revokingAdmin.fullName })}
          confirmLabel={t('settings.remove')}
          submitting={revoking}
          onConfirm={handleRevoke}
          onCancel={() => setRevokingAdmin(null)}
        />
      )}

      {deletingDropdown && (
        <ConfirmDialog
          title={t('settings.confirmDropdownDeleteTitle')}
          message={t('settings.confirmDropdownDeleteMessage', { value: deletingDropdown.entry.value })}
          confirmLabel={t('common.delete')}
          submitting={deletingDropdownBusy}
          onConfirm={handleDeleteDropdown}
          onCancel={() => setDeletingDropdown(null)}
        />
      )}
    </div>
  )
}
