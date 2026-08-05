import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { StagingDevice, DropdownState, Asset } from '../types'
import { agentService } from '../services/agentService'
import { useAuth } from '../AuthContext'
import { IconX, IconCheck } from './Icons'
import DeviceTypeBadge from './DeviceTypeBadge'
import ConfirmDialog from './ConfirmDialog'
import Portal from './Portal'
import { useMediaQuery } from '../hooks/useMediaQuery'

interface StagingReviewModalProps {
  staging: StagingDevice
  dropdowns: DropdownState
  onClose: () => void
  onApproved: (device: Asset) => void
  onRejected: (stagingId: string) => void
}

function SpecRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border-faint)' }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)' }}>{value || value === 0 ? value : '—'}</span>
    </div>
  )
}

export default function StagingReviewModal({ staging, dropdowns, onClose, onApproved, onRejected }: StagingReviewModalProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isReadOnly = user?.role === 'READ_ONLY_AUDITOR'
  const isMobile = useMediaQuery('(max-width: 600px)')
  const [owner, setOwner] = useState(staging.owner || '')
  const [department, setDepartment] = useState(staging.department || '')
  const [location, setLocation] = useState(staging.location || '')
  const [notes, setNotes] = useState(staging.notes || '')
  const [errors, setErrors] = useState<{ owner?: string; department?: string; location?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)

  const handleApprove = async () => {
    const next: typeof errors = {}
    if (!owner.trim()) next.owner = t('addAssetModal.ownerRequired') ?? ''
    if (!department.trim()) next.department = t('addAssetModal.departmentRequired') ?? ''
    if (!location.trim()) next.location = t('addAssetModal.locationRequired') ?? ''
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSubmitting(true)
    try {
      const { device } = await agentService.approve(staging.id, { owner, department, location, notes })
      onApproved(device)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    setSubmitting(true)
    try {
      await agentService.reject(staging.id)
      onRejected(staging.id)
    } finally {
      setSubmitting(false)
    }
  }

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
          width: 580,
          maxWidth: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 48px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text-primary)' }}>{t('staging.reviewModalTitle')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{staging.hostName}</span>
              <DeviceTypeBadge type={staging.deviceType} />
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <IconX size={18} />
          </button>
        </div>

        <div style={{ padding: 22, overflowY: 'auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>
              {t('staging.autoCollected')}
            </div>
            <SpecRow label={t('drawer.ipAddress')} value={staging.ipAddress} />
            <SpecRow label={t('drawer.macAddress')} value={staging.macAddress} />
            <SpecRow label={t('drawer.serialNumber')} value={staging.serialNumber} />
            <SpecRow label={t('drawer.manufacturer')} value={staging.manufacturer} />
            <SpecRow label={t('drawer.model')} value={staging.model} />
            <SpecRow label={t('drawer.processor')} value={staging.processor} />
            <SpecRow label={t('drawer.memory')} value={staging.memory != null ? `${staging.memory} GB` : null} />
            <SpecRow label={t('drawer.diskStorage')} value={staging.diskStorageGB != null ? `${staging.diskStorageGB} GB` : null} />
            <SpecRow label={t('drawer.operatingSystem')} value={staging.operatingSystem} />
            <SpecRow label={t('drawer.installedApps')} value={staging.installedApps?.length ?? 0} />
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>
              {t('staging.submittedAt')}: {new Date(staging.submittedAt).toLocaleString()}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>
              {t('staging.manualFields')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('staging.owner')}</label>
                <input className="input-base" value={owner} onChange={(e) => setOwner(e.target.value)} />
                {errors.owner && <span style={{ fontSize: 11, color: '#cf222e' }}>{errors.owner}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('staging.department')}</label>
                <select className="input-base" value={department} onChange={(e) => setDepartment(e.target.value)}>
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
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('staging.location')}</label>
                <select className="input-base" value={location} onChange={(e) => setLocation(e.target.value)}>
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
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('staging.notes')}</label>
                <textarea className="input-base" style={{ minHeight: 60, resize: 'vertical' }} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: 16, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: isReadOnly ? 'flex-end' : 'space-between', gap: 8 }}>
          {!isReadOnly && (
            <button type="button" className="btn-danger" onClick={() => setShowRejectConfirm(true)} disabled={submitting}>
              {t('staging.reject')}
            </button>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn-ghost" onClick={onClose}>
              {t('staging.close')}
            </button>
            {!isReadOnly && (
              <button type="button" className="btn-primary" onClick={handleApprove} disabled={submitting}>
                <IconCheck size={13} color="white" />
                {t('staging.approveAndLog')}
              </button>
            )}
          </div>
        </div>
      </div>

      {showRejectConfirm && (
        <ConfirmDialog
          title={t('staging.confirmRejectTitle')}
          message={t('staging.confirmRejectMessage', { hostName: staging.hostName })}
          confirmLabel={t('staging.reject')}
          submitting={submitting}
          onConfirm={handleReject}
          onCancel={() => setShowRejectConfirm(false)}
        />
      )}
    </div>
    </Portal>
  )
}
