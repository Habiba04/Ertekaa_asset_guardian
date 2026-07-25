import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { auditService } from '../services/auditService'
import type { AuditLogEntry, EventCategory } from '../types'
import EventTypeBadge from '../components/EventTypeBadge'
import { IconSearch, IconDownload } from '../components/Icons'

const CATEGORIES: (EventCategory | 'All')[] = ['All', 'created', 'updated', 'checkin', 'approved', 'deleted', 'alert']

export default function AuditLogsScreen() {
  const { t } = useTranslation()
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('All')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    auditService
      .list({ search, category, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })
      .then((resp) => {
        if (cancelled) return
        setLogs(resp.logs)
        setTotal(resp.total)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [search, category, dateFrom, dateTo])

  const catLabel: Record<string, string> = useMemo(
    () => ({
      All: t('auditLogs.catAll'),
      created: t('auditLogs.catCreated'),
      updated: t('auditLogs.catUpdated'),
      checkin: t('auditLogs.catCheckin'),
      deleted: t('auditLogs.catDeleted'),
      approved: t('auditLogs.catApproved'),
      alert: t('auditLogs.catAlert'),
    }),
    [t]
  )

  const handleExport = () => {
    const headers = ['Timestamp', 'Device Hostname', 'Event Type', 'User / Source', 'Change Details']
    const rows = logs.map((l) => [new Date(l.timestamp).toISOString(), l.hostname, l.eventType, l.userSource, l.changeSummary])
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `asset-guardian-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page-padding">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{t('auditLogs.title')}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
            {t('auditLogs.subtitle', { filtered: logs.length, total })}
          </div>
        </div>
        <button type="button" className="btn-ghost" onClick={handleExport}>
          <IconDownload size={13} />
          {t('auditLogs.exportLog')}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            style={{
              padding: '6px 12px',
              borderRadius: 16,
              fontSize: 12,
              fontWeight: 600,
              border: '1px solid var(--border)',
              cursor: 'pointer',
              backgroundColor: category === cat ? '#0969da' : 'var(--bg-surface)',
              color: category === cat ? 'white' : 'var(--text-body)',
            }}
          >
            {catLabel[cat]}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
          <span style={{ position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)' }}>
            <IconSearch />
          </span>
          <input
            className="input-base"
            style={{ paddingInlineStart: 32 }}
            placeholder={t('auditLogs.searchPlaceholder') ?? ''}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <input type="date" className="input-base" style={{ width: 160 }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('auditLogs.to')}</span>
        <input type="date" className="input-base" style={{ width: 160 }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        {(dateFrom || dateTo) && (
          <button type="button" className="btn-ghost" onClick={() => { setDateFrom(''); setDateTo('') }}>
            {t('auditLogs.clearDates')}
          </button>
        )}
      </div>

      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 760 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-elevated)' }}>
                <th style={{ padding: '10px 14px', textAlign: 'start', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('auditLogs.colTimestamp')}</th>
                <th style={{ padding: '10px 14px', textAlign: 'start', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('auditLogs.colHostname')}</th>
                <th style={{ padding: '10px 14px', textAlign: 'start', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('auditLogs.colEventType')}</th>
                <th style={{ padding: '10px 14px', textAlign: 'start', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('auditLogs.colUserSource')}</th>
                <th style={{ padding: '10px 14px', textAlign: 'start', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('auditLogs.colChangeSummary')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {t('common.loading')}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {t('auditLogs.noEvents')}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-faint)' }}>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{log.hostname}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <EventTypeBadge category={log.eventCategory} label={log.eventType} />
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-body)', whiteSpace: 'nowrap' }}>{log.userSource}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-body)', maxWidth: 420 }}>{log.changeSummary}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 11.5, color: 'var(--text-secondary)' }}>
        <span>{t('auditLogs.showingCount', { count: logs.length, total })}</span>
        <span>{t('auditLogs.retentionNote')}</span>
      </div>
    </div>
  )
}
