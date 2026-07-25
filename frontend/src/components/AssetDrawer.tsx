import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Asset, AuditLogEntry, DeviceType, DropdownState } from '../types'
import { assetService } from '../services/assetService'
import { IconX, IconEdit, IconCheck } from './Icons'
import StatusBadge from './StatusBadge'
import DeviceTypeBadge from './DeviceTypeBadge'
import EventTypeBadge from './EventTypeBadge'
import { useMediaQuery } from '../hooks/useMediaQuery'
import Portal from './Portal'
import { useAuth } from '../AuthContext'

type DrawerTab = 'hardware' | 'admin' | 'activity'

const DEVICE_TYPES: DeviceType[] = ['Laptop', 'PC', 'Switch', 'Server', 'Printer', 'Router', 'Other']

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
      {children}
    </div>
  )
}

function ReadonlyValue({ value }: { value: string | null | undefined }) {
  return (
    <div style={{ fontSize: 13, color: 'var(--text-primary)', padding: '7px 0', minHeight: 28 }}>
      {value && value.trim() ? value : '—'}
    </div>
  )
}

interface AssetDrawerProps {
  asset: Asset
  dropdowns: DropdownState
  onClose: () => void
  onUpdated: (updated: Asset) => void
}

export default function AssetDrawer({ asset, dropdowns, onClose, onUpdated }: AssetDrawerProps) {
  const { t } = useTranslation()
  const isMobile = useMediaQuery('(max-width: 600px)')
  const { user: currentUser } = useAuth()
  const [tab, setTab] = useState<DrawerTab>('hardware')
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<Asset>(asset)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [activity, setActivity] = useState<AuditLogEntry[]>([])
  const [activityLoading, setActivityLoading] = useState(false)

  useEffect(() => {
    setForm(asset)
    setIsEditing(false)
  }, [asset])

  useEffect(() => {
    if (tab !== 'activity') return
    let cancelled = false
    setActivityLoading(true)
    assetService
      .getActivity(asset.id)
      .then(({ activity: logs }) => {
        if (!cancelled) setActivity(logs)
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tab, asset.id])

  const update = (field: keyof Asset, value: string) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const { asset: saved } = await assetService.update(asset.id, form)
      onUpdated(saved)
      setIsEditing(false)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = { fontSize: 13 }

  return (
    <Portal>
      <>
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(28,33,40,0.35)',
            zIndex: 40,
          }}
        />
        <div
          className="drawer-panel"
          style={{
            position: 'fixed',
            insetInlineEnd: 0,
            top: 0,
            bottom: 0,
            width: 460,
            maxWidth: '92vw',
            backgroundColor: 'var(--bg-surface)',
            zIndex: 41,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-8px 0 24px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {form.hostName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  <DeviceTypeBadge type={form.deviceType} />
                  <StatusBadge status={form.status} />
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0 }}
              >
                <IconX size={18} />
              </button>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 8 }}>
              {t('drawer.lastSeenPrefix')} {new Date(form.lastSeen).toLocaleString()} · {t(`dataSource.${form.dataSource}` as never, form.dataSource)}
            </div>
          </div>

          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px' }}>
            {(['hardware', 'admin', 'activity'] as DrawerTab[]).map((tKey) => (
              <button
                key={tKey}
                type="button"
                onClick={() => setTab(tKey)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: '10px 14px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: tab === tKey ? '#0969da' : 'var(--text-secondary)',
                  borderBottom: tab === tKey ? '2px solid #0969da' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                {t(`drawer.tab${tKey.charAt(0).toUpperCase()}${tKey.slice(1)}`)}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            {tab === 'hardware' && (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                <Field label={t('drawer.hostName')}>
                  {isEditing ? (
                    <input className="input-base" style={inputStyle} value={form.hostName} onChange={(e) => update('hostName', e.target.value)} />
                  ) : (
                    <ReadonlyValue value={form.hostName} />
                  )}
                </Field>
                <Field label={t('drawer.oldHostname')}>
                  {isEditing ? (
                    <input className="input-base" style={inputStyle} value={form.oldHostName} onChange={(e) => update('oldHostName', e.target.value)} />
                  ) : (
                    <ReadonlyValue value={form.oldHostName} />
                  )}
                </Field>
                <Field label={t('drawer.deviceType')}>
                  {isEditing ? (
                    <select className="input-base" style={inputStyle} value={form.deviceType} onChange={(e) => update('deviceType', e.target.value)}>
                      {DEVICE_TYPES.map((dt) => (
                        <option key={dt} value={dt}>
                          {t(`deviceType.${dt}`)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <ReadonlyValue value={t(`deviceType.${form.deviceType}`)} />
                  )}
                </Field>
                <Field label={t('drawer.serialNumber')}>
                  {isEditing ? (
                    <input className="input-base" style={inputStyle} value={form.serialNumber} onChange={(e) => update('serialNumber', e.target.value)} />
                  ) : (
                    <ReadonlyValue value={form.serialNumber} />
                  )}
                </Field>
                <Field label={t('drawer.manufacturer')}>
                  {isEditing ? (
                    <input className="input-base" style={inputStyle} value={form.manufacturer} onChange={(e) => update('manufacturer', e.target.value)} />
                  ) : (
                    <ReadonlyValue value={form.manufacturer} />
                  )}
                </Field>
                <Field label={t('drawer.model')}>
                  {isEditing ? (
                    <input className="input-base" style={inputStyle} value={form.model} onChange={(e) => update('model', e.target.value)} />
                  ) : (
                    <ReadonlyValue value={form.model} />
                  )}
                </Field>
                <Field label={t('drawer.processor')}>
                  {isEditing ? (
                    <input className="input-base" style={inputStyle} value={form.processor} onChange={(e) => update('processor', e.target.value)} />
                  ) : (
                    <ReadonlyValue value={form.processor} />
                  )}
                </Field>
                <Field label={t('drawer.memory')}>
                  {isEditing ? (
                    <input className="input-base" style={inputStyle} value={form.memory} onChange={(e) => update('memory', e.target.value)} />
                  ) : (
                    <ReadonlyValue value={form.memory} />
                  )}
                </Field>
                <Field label={t('drawer.operatingSystem')}>
                  {isEditing ? (
                    <input className="input-base" style={inputStyle} value={form.operatingSystem} onChange={(e) => update('operatingSystem', e.target.value)} />
                  ) : (
                    <ReadonlyValue value={form.operatingSystem} />
                  )}
                </Field>
                <Field label={t('drawer.macAddress')}>
                  {isEditing ? (
                    <input className="input-base" style={inputStyle} value={form.macAddress} onChange={(e) => update('macAddress', e.target.value)} />
                  ) : (
                    <ReadonlyValue value={form.macAddress} />
                  )}
                </Field>
                <Field label={t('drawer.ipAddress')}>
                  {isEditing ? (
                    <input className="input-base ltr-always" style={inputStyle} value={form.ipAddress} onChange={(e) => update('ipAddress', e.target.value)} />
                  ) : (
                    <div className="ltr-always" style={{ fontSize: 13, color: 'var(--text-primary)', padding: '7px 0' }}>
                      {form.ipAddress || '—'}
                    </div>
                  )}
                </Field>
                <Field label={t('drawer.maintenanceDate')}>
                  {isEditing ? (
                    <input
                      type="date"
                      className="input-base"
                      style={inputStyle}
                      value={form.lastMaintenanceDate ? form.lastMaintenanceDate.slice(0, 10) : ''}
                      onChange={(e) => update('lastMaintenanceDate', e.target.value)}
                    />
                  ) : (
                    <ReadonlyValue value={form.lastMaintenanceDate ? new Date(form.lastMaintenanceDate).toLocaleDateString() : ''} />
                  )}
                </Field>
              </div>
            )}

            {tab === 'admin' && (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                <Field label={t('drawer.currentOwner')}>
                  {isEditing ? (
                    <input className="input-base" style={inputStyle} value={form.owner} onChange={(e) => update('owner', e.target.value)} />
                  ) : (
                    <ReadonlyValue value={form.owner} />
                  )}
                </Field>
                <Field label={t('drawer.lastLoggedUser')}>
                  {isEditing ? (
                    <input className="input-base" style={inputStyle} value={form.lastUser} onChange={(e) => update('lastUser', e.target.value)} />
                  ) : (
                    <ReadonlyValue value={form.lastUser} />
                  )}
                </Field>
                <Field label={t('drawer.department')}>
                  {isEditing ? (
                    <select className="input-base" style={inputStyle} value={form.department} onChange={(e) => update('department', e.target.value)}>
                      <option value="">—</option>
                      {dropdowns.departments.map((d) => (
                        <option key={d.id} value={d.value}>
                          {d.value}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <ReadonlyValue value={form.department} />
                  )}
                </Field>
                <Field label={t('drawer.location')}>
                  {isEditing ? (
                    <select className="input-base" style={inputStyle} value={form.location} onChange={(e) => update('location', e.target.value)}>
                      <option value="">—</option>
                      {dropdowns.locations.map((l) => (
                        <option key={l.id} value={l.value}>
                          {l.value}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <ReadonlyValue value={form.location} />
                  )}
                </Field>
                <Field label={t('drawer.dataSource')}>
                  <ReadonlyValue value={t(`dataSource.${form.dataSource}` as never, form.dataSource)} />
                </Field>
                <Field label={t('drawer.achievedBy')}>
                  <ReadonlyValue value={form.achievedBy} />
                </Field>
                <div style={{ gridColumn: '1 / -1' }}>
                  <Field label={t('drawer.notes')}>
                    {isEditing ? (
                      <textarea
                        className="input-base"
                        style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                        value={form.notes}
                        onChange={(e) => update('notes', e.target.value)}
                      />
                    ) : (
                      <div style={{ fontSize: 13, color: form.notes ? 'var(--text-primary)' : 'var(--text-secondary)', padding: '7px 0', whiteSpace: 'pre-wrap' }}>
                        {form.notes || t('drawer.noNotes')}
                      </div>
                    )}
                  </Field>
                </div>
              </div>
            )}

            {tab === 'activity' && (
              <div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{t('drawer.deviceHistory')}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                    {t('drawer.recordedEvents', { count: activity.length, plural: activity.length === 1 ? '' : 's' })}
                  </div>
                </div>
                {activityLoading ? (
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{t('common.loading')}</div>
                ) : activity.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{t('drawer.noActivity')}</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {activity.map((entry, idx) => (
                      <div key={entry.id} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                          <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#0969da', marginTop: 4 }} />
                          {idx !== activity.length - 1 && <div style={{ width: 1.5, flex: 1, backgroundColor: 'var(--border)', marginTop: 2 }} />}
                        </div>
                        <div style={{ paddingBottom: 18, flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <EventTypeBadge category={entry.eventCategory} label={entry.eventType} />
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                              {new Date(entry.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div style={{ fontSize: 12.5, color: 'var(--text-body)', marginTop: 4 }}>{entry.changeSummary}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{entry.userSource}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {tab !== 'activity' && (
            <div
              style={{
                padding: 16,
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                alignItems: 'center',
              }}
            >
              {savedFlash && <span style={{ fontSize: 12, color: '#1a7f37', marginInlineEnd: 'auto' }}>{t('drawer.changesSaved')} ✓</span>}
              {isEditing ? (
                <>
                  <button type="button" className="btn-ghost" onClick={() => { setForm(asset); setIsEditing(false) }}>
                    {t('drawer.cancel')}
                  </button>
                  <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
                    <IconCheck size={13} color="white" />
                    {t('drawer.saveChanges')}
                  </button>
                </>
              ) : currentUser?.role !== 'READ_ONLY_AUDITOR' && (
                <button type="button" className="btn-ghost" onClick={() => setIsEditing(true)}>
                  <IconEdit size={13} />
                  {t('drawer.editRecord')}
                </button>
              )}
            </div>
          )}
        </div>
      </>
    </Portal>
  )
}
