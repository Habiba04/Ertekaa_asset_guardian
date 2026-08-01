import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { agentService } from '../services/agentService'
import { settingsService } from '../services/settingsService'
import type { StagingDevice, DropdownState } from '../types'
import DeviceTypeBadge from '../components/DeviceTypeBadge'
import StagingReviewModal from '../components/StagingReviewModal'
import { IconInbox, IconSync } from '../components/Icons'

const EMPTY_DROPDOWNS: DropdownState = { departments: [], locations: [] }
const POLL_INTERVAL_MS = 15000

export default function StagingQueueScreen() {
  const { t } = useTranslation()
  const [queue, setQueue] = useState<StagingDevice[]>([])
  const [dropdowns, setDropdowns] = useState<DropdownState>(EMPTY_DROPDOWNS)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [reviewing, setReviewing] = useState<StagingDevice | null>(null)

  const loadQueue = async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const resp = await agentService.listStagingQueue('PENDING_REVIEW')
      setQueue(resp.queue)
    } finally {
      if (silent) setRefreshing(false)
      else setLoading(false)
    }
  }

  useEffect(() => {
    loadQueue()
    settingsService.listDropdowns().then(setDropdowns).catch(() => setDropdowns(EMPTY_DROPDOWNS))

    // Poll in the background so newly re-staged devices (e.g. after an
    // asset was deleted and the agent reported in again) show up without
    // requiring a manual page reload.
    const interval = setInterval(() => loadQueue(true), POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="page-padding">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{t('staging.reviewQueue')}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>{t('staging.reviewQueueSub')}</div>
        </div>
        <button type="button" className="btn-ghost" onClick={() => loadQueue(true)} disabled={refreshing}>
          <IconSync size={13} spin={refreshing} />
          {t('staging.refresh')}
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>{t('common.loading')}</div>
      ) : queue.length === 0 ? (
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            border: '1px dashed var(--border)',
            borderRadius: 10,
            color: 'var(--text-secondary)',
          }}
        >
          <IconInbox size={28} />
          <div style={{ fontSize: 13.5, marginTop: 10 }}>{t('staging.noPending')}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {queue.map((item) => (
            <div
              key={item.id}
              onClick={() => setReviewing(item)}
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 16,
                cursor: 'pointer',
                transition: 'border-color 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{item.hostName}</div>
                <DeviceTypeBadge type={item.deviceType} />
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 6 }} className="ltr-always">
                {item.ipAddress} · {item.macAddress}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4 }}>
                {item.manufacturer} {item.model}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-faint)' }}>
                {t('staging.submittedAt')}: {new Date(item.submittedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {reviewing && (
        <StagingReviewModal
          staging={reviewing}
          dropdowns={dropdowns}
          onClose={() => setReviewing(null)}
          onApproved={() => {
            setReviewing(null)
            loadQueue()
          }}
          onRejected={() => {
            setReviewing(null)
            loadQueue()
          }}
        />
      )}
    </div>
  )
}
