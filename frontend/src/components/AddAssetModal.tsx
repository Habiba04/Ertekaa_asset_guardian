import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DeviceType, DropdownState, NewAssetForm, Asset } from '../types'
import { assetService } from '../services/assetService'
import { useAuth } from '../AuthContext'
import { IconX, IconCheck } from './Icons'
import Portal from './Portal'
import { useMediaQuery } from '../hooks/useMediaQuery'

const DEVICE_TYPES: DeviceType[] = ['Laptop', 'PC', 'Switch', 'Server', 'Printer', 'Router', 'Other']
const MAC_ADDRESS_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/

function slugify(value: string): string {
  return (value || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

const EMPTY_FORM: NewAssetForm = {
  oldHostName: '',
  ipAddress: '',
  deviceType: 'Laptop',
  manufacturer: '',
  model: '',
  processor: '',
  memory: '',
  diskStorageGB: '',
  operatingSystem: '',
  serialNumber: '',
  macAddress: '',
  owner: '',
  lastUser: '',
  department: '',
  location: '',
  lastMaintenanceDate: '',
  notes: '',
}

interface AddAssetModalProps {
  dropdowns: DropdownState
  onClose: () => void
  onCreated: (asset: Asset) => void
}

export default function AddAssetModal({ dropdowns, onClose, onCreated }: AddAssetModalProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isMobile = useMediaQuery('(max-width: 600px)')
  const [form, setForm] = useState<NewAssetForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof NewAssetForm, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [successAsset, setSuccessAsset] = useState<Asset | null>(null)

  const update = (field: keyof NewAssetForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const validate = (): boolean => {
    const next: Partial<Record<keyof NewAssetForm, string>> = {}
    if (!form.serialNumber.trim()) next.serialNumber = t('addAssetModal.serialRequired')
    if (!form.macAddress.trim()) next.macAddress = t('addAssetModal.macRequired')
    else if (!MAC_ADDRESS_REGEX.test(form.macAddress.trim())) next.macAddress = t('addAssetModal.macFormatError')
    if (!form.owner.trim()) next.owner = t('addAssetModal.ownerRequired')
    if (!form.department.trim()) next.department = t('addAssetModal.departmentRequired')
    if (!form.location.trim()) next.location = t('addAssetModal.locationRequired')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        memory: form.memory ? String(form.memory) : undefined,
        diskStorageGB: form.diskStorageGB ? String(form.diskStorageGB) : undefined,
      }
      const { asset } = await assetService.create(payload)
      setSuccessAsset(asset)
      onCreated(asset)
    } finally {
      setSubmitting(false)
    }
  }

  const achievedByPreview = `${user?.fullName ?? ''} (${t('dataSource.Manual')})`

  const hostnamePreview = useMemo(() => {
    const loc = slugify(form.location)
    const dept = slugify(form.department)
    const type = slugify(form.deviceType)
    if (!loc || !dept) return t('addAssetModal.hostnamePreviewPending')
    return `${loc}${dept}-${type}###`
  }, [form.location, form.department, form.deviceType, t])

  return (
    <Portal>
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(28,33,40,0.4)',
        zIndex: 50,
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
          width: 640,
          maxWidth: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 48px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text-primary)' }}>{t('addAssetModal.title')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{t('addAssetModal.subtitle')}</div>
          </div>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <IconX size={18} />
          </button>
        </div>

        {successAsset ? (
          <div style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: 'rgba(26,127,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconCheck size={22} color="#1a7f37" />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{t('addAssetModal.successTitle')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {successAsset.hostName} {t('addAssetModal.successBody')}
            </div>
            <button type="button" className="btn-primary" onClick={onClose} style={{ marginTop: 8 }}>
              {t('common.close')}
            </button>
          </div>
        ) : (
          <>
            <div style={{ padding: 22, overflowY: 'auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 20, flexWrap: 'wrap', backgroundColor: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 14px' }}>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    {t('addAssetModal.dataSource')}
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{t('dataSource.Manual')}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    {t('addAssetModal.achievedBy')}
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{achievedByPreview}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    {t('addAssetModal.hostNamePreview')}
                  </div>
                  <div className="ltr-always" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {hostnamePreview}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('addAssetModal.oldHostName')}</label>
                <input className="input-base" value={form.oldHostName} onChange={(e) => update('oldHostName', e.target.value)} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('addAssetModal.deviceType')}</label>
                <select className="input-base" value={form.deviceType} onChange={(e) => update('deviceType', e.target.value)}>
                  {DEVICE_TYPES.map((dt) => (
                    <option key={dt} value={dt}>
                      {t(`deviceType.${dt}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('addAssetModal.manufacturer')}</label>
                <input className="input-base" value={form.manufacturer} onChange={(e) => update('manufacturer', e.target.value)} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('addAssetModal.model')}</label>
                <input className="input-base" value={form.model} onChange={(e) => update('model', e.target.value)} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('addAssetModal.processor')}</label>
                <input className="input-base" value={form.processor} onChange={(e) => update('processor', e.target.value)} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('addAssetModal.operatingSystem')}</label>
                <input className="input-base" value={form.operatingSystem} onChange={(e) => update('operatingSystem', e.target.value)} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('addAssetModal.memory')}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="number" min="0" className="input-base" value={form.memory} onChange={(e) => update('memory', e.target.value)} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>GB</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('addAssetModal.diskStorage')}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="number" min="0" className="input-base" value={form.diskStorageGB} onChange={(e) => update('diskStorageGB', e.target.value)} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>GB</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('addAssetModal.serialNumber')}</label>
                <input className="input-base" value={form.serialNumber} onChange={(e) => update('serialNumber', e.target.value)} />
                {errors.serialNumber && <span style={{ fontSize: 11, color: '#cf222e' }}>{errors.serialNumber}</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('addAssetModal.macAddress')}</label>
                <input className="input-base ltr-always" value={form.macAddress} onChange={(e) => update('macAddress', e.target.value)} placeholder="AA:BB:CC:DD:EE:FF" />
                {errors.macAddress && <span style={{ fontSize: 11, color: '#cf222e' }}>{errors.macAddress}</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('addAssetModal.ipAddress')}</label>
                <input className="input-base ltr-always" value={form.ipAddress} onChange={(e) => update('ipAddress', e.target.value)} placeholder="192.168.1.10" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('addAssetModal.currentOwner')}</label>
                <input className="input-base" value={form.owner} onChange={(e) => update('owner', e.target.value)} />
                {errors.owner && <span style={{ fontSize: 11, color: '#cf222e' }}>{errors.owner}</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('addAssetModal.lastUser')}</label>
                <input className="input-base" value={form.lastUser} onChange={(e) => update('lastUser', e.target.value)} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('addAssetModal.department')}</label>
                <select className="input-base" value={form.department} onChange={(e) => update('department', e.target.value)}>
                  <option value="">{t('addAssetModal.selectDepartment')}</option>
                  {dropdowns.departments.map((d) => (
                    <option key={d.id} value={d.value}>
                      {d.value}
                    </option>
                  ))}
                </select>
                {errors.department && <span style={{ fontSize: 11, color: '#cf222e' }}>{errors.department}</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('addAssetModal.location')}</label>
                <select className="input-base" value={form.location} onChange={(e) => update('location', e.target.value)}>
                  <option value="">{t('addAssetModal.selectLocation')}</option>
                  {dropdowns.locations.map((l) => (
                    <option key={l.id} value={l.value}>
                      {l.value}
                    </option>
                  ))}
                </select>
                {errors.location && <span style={{ fontSize: 11, color: '#cf222e' }}>{errors.location}</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('addAssetModal.maintenanceDate')}</label>
                <input type="date" className="input-base" value={form.lastMaintenanceDate} onChange={(e) => update('lastMaintenanceDate', e.target.value)} />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('addAssetModal.notes')}</label>
                <textarea
                  className="input-base"
                  style={{ minHeight: 70, resize: 'vertical' }}
                  value={form.notes}
                  onChange={(e) => update('notes', e.target.value)}
                  placeholder={t('addAssetModal.notesPlaceholder') ?? ''}
                />
              </div>
            </div>

            <div style={{ padding: 16, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn-ghost" onClick={onClose}>
                {t('addAssetModal.cancel')}
              </button>
              <button type="button" className="btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? t('common.loading') : t('addAssetModal.addAsset')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
    </Portal>
  )
}
