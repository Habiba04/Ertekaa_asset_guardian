import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { auditService } from '../services/auditService'
import type { AuditLogEntry, EventCategory } from '../types'
import EventTypeBadge from '../components/EventTypeBadge'
import Pagination from '../components/Pagination'
import { IconSearch, IconDownload } from '../components/Icons'

const CATEGORIES: (EventCategory | 'All')[] = ['All', 'created', 'updated', 'checkin', 'approved', 'deleted', 'alert']
const DEFAULT_PAGE_SIZE = 25
const SEARCH_DEBOUNCE_MS = 350

export default function AuditLogsScreen() {
  const { t } = useTranslation()
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('All')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [category, dateFrom, dateTo])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    auditService
      .list({ search, category, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, page, pageSize })
      .then((resp) => {
        if (cancelled) return
        setLogs(resp.logs)
        setTotal(resp.total)
        setTotalPages(resp.totalPages)
        setCategoryCounts(resp.categoryCounts)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [search, category, dateFrom, dateTo, page, pageSize])

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

  const handleExport = async () => {
    setExporting(true)
    try {
      const resp = await auditService.list({
        search, category, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, page: 1, pageSize: 100000,
      })
      const headers = ['Timestamp', 'Device Hostname', 'Event Type', 'User / Source', 'Change Details']
      const rows = resp.logs.map((l) => [new Date(l.timestamp).toISOString(), l.hostname, l.eventType, l.userSource, l.changeSummary])
      const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `asset-guardian-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="page-padding">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{t('auditLogs.title')}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
            {t('auditLogs.subtitle', { filtered: total, total })}
          </div>
        </div>
        <button type="button" className="btn-ghost" onClick={handleExport} disabled={exporting}>
          <IconDownload size={13} />
          {exporting ? t('common.loading') : t('auditLogs.exportLog')}
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
            {catLabel[cat]} {categoryCounts[cat] != null && `(${categoryCounts[cat]})`}
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
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
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

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
        />
      </div>

      {/* <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, fontSize: 11.5, color: 'var(--text-secondary)' }}>
        <span>{t('auditLogs.retentionNote')}</span>
      </div> */}
    </div>
  )
}
