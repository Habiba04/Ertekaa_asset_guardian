import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { assetService } from '../services/assetService'
import { settingsService } from '../services/settingsService'
import type { Asset, DeviceType, DropdownState } from '../types'
import DeviceTypeBadge from '../components/DeviceTypeBadge'
import StatusBadge from '../components/StatusBadge'
import AssetDrawer from '../components/AssetDrawer'
import AddAssetModal from '../components/AddAssetModal'
import ImportModal from '../components/ImportModal'
import ConfirmDialog from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import { IconSearch, IconUpload, IconSync, IconPlus, IconDownload, IconTrash, IconColumns, IconCheck } from '../components/Icons'
import { useAuth } from '../AuthContext'

const EMPTY_DROPDOWNS: DropdownState = { departments: [], locations: [] }
const DEVICE_TYPES: DeviceType[] = [
  'Laptop', 'PC', 'Switch', 'Server', 'Printer', 'Router',
  'Firewall', 'Access Point', 'DVR', 'Fingerprint Scanner', 'Screen', 'Other',
]
const DEFAULT_PAGE_SIZE = 25
const SEARCH_DEBOUNCE_MS = 350

interface ColumnDef {
  key: string
  labelKey: string
  mandatory?: boolean
  render: (a: Asset) => React.ReactNode
}

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'hostName', labelKey: 'inventory.colHostName', mandatory: true, render: (a) => <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.hostName}</span> },
  { key: 'deviceType', labelKey: 'inventory.colType', render: (a) => <DeviceTypeBadge type={a.deviceType} /> },
  { key: 'manufacturer', labelKey: 'inventory.colManufacturer', render: (a) => <>{a.manufacturer || '—'}</> },
  { key: 'model', labelKey: 'inventory.colModel', render: (a) => <>{a.model || '—'}</> },
  { key: 'operatingSystem', labelKey: 'inventory.colOs', render: (a) => <>{a.operatingSystem || '—'}</> },
  { key: 'status', labelKey: 'inventory.colStatus', render: (a) => <StatusBadge status={a.status} /> },
  { key: 'owner', labelKey: 'inventory.colOwner', render: (a) => <>{a.owner || '—'}</> },
  { key: 'department', labelKey: 'inventory.colDepartment', render: (a) => <>{a.department || '—'}</> },
  { key: 'location', labelKey: 'inventory.colLocation', render: (a) => <>{a.location || '—'}</> },
  { key: 'lastSeen', labelKey: 'inventory.colLastSeen', render: (a) => <span style={{ whiteSpace: 'nowrap' }}>{new Date(a.lastSeen).toLocaleString()}</span> },
  { key: 'ipAddress', labelKey: 'inventory.colIpAddress', render: (a) => <span className="ltr-always">{a.ipAddress || '—'}</span> },
  { key: 'macAddress', labelKey: 'inventory.colMacAddress', render: (a) => <span className="ltr-always">{a.macAddress || '—'}</span> },
  { key: 'serialNumber', labelKey: 'inventory.colSerialNumber', render: (a) => <>{a.serialNumber || '—'}</> },
  { key: 'processor', labelKey: 'inventory.colProcessor', render: (a) => <>{a.processor || '—'}</> },
  { key: 'memory', labelKey: 'inventory.colMemory', render: (a) => <>{a.memory != null ? `${a.memory} GB` : '—'}</> },
  { key: 'diskStorageGB', labelKey: 'inventory.colDiskStorage', render: (a) => <>{a.diskStorageGB != null ? `${a.diskStorageGB} GB` : '—'}</> },
  { key: 'lastUser', labelKey: 'inventory.colLastUser', render: (a) => <>{a.lastUser || '—'}</> },
  { key: 'oldHostName', labelKey: 'inventory.colOldHostName', render: (a) => <>{a.oldHostName || '—'}</> },
  { key: 'dataSource', labelKey: 'inventory.colDataSource', render: (a) => <>{a.dataSource}</> },
]

const DEFAULT_VISIBLE_COLUMNS = [
  'hostName', 'deviceType', 'manufacturer', 'model', 'operatingSystem',
  'status', 'owner', 'department', 'location', 'lastSeen',
]
const COLUMN_PREFS_KEY = 'ag_inventory_columns'

export default function InventoryScreen() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [assets, setAssets] = useState<Asset[]>([])
  const [total, setTotal] = useState(0)
  const [dropdowns, setDropdowns] = useState<DropdownState>(EMPTY_DROPDOWNS)
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('All')
  const [location, setLocation] = useState('All')
  const [deviceType, setDeviceType] = useState('All')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showColumnPicker, setShowColumnPicker] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(COLUMN_PREFS_KEY)
      if (saved) return new Set(JSON.parse(saved))
    } catch {
      // fall through to defaults
    }
    return new Set(DEFAULT_VISIBLE_COLUMNS)
  })
  const columnPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [department, location, deviceType])

  const loadAssets = async () => {
    setLoading(true)
    try {
      const resp = await assetService.list({ search, department, location, deviceType, page, pageSize })
      setAssets(resp.assets)
      setTotal(resp.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAssets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, department, location, deviceType, page, pageSize])

  useEffect(() => {
    settingsService.listDropdowns().then(setDropdowns).catch(() => setDropdowns(EMPTY_DROPDOWNS))
  }, [])

  useEffect(() => {
    localStorage.setItem(COLUMN_PREFS_KEY, JSON.stringify(Array.from(visibleColumns)))
  }, [visibleColumns])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (columnPickerRef.current && !columnPickerRef.current.contains(e.target as Node)) {
        setShowColumnPicker(false)
      }
    }
    if (showColumnPicker) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showColumnPicker])

  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(''), 3200)
    return () => clearTimeout(timeout)
  }, [toast])

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const activeColumns = useMemo(
    () => COLUMN_DEFS.filter((c) => c.mandatory || visibleColumns.has(c.key)),
    [visibleColumns]
  )

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAllOnPage = () => {
    const pageIds = assets.map((a) => a.id)
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id))
      } else {
        pageIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const isPageFullySelected = assets.length > 0 && assets.every((a) => selectedIds.has(a.id))

  const handleSync = async () => {
    setSyncing(true)
    try {
      const ids = Array.from(selectedIds)
      const resp = await assetService.sync(ids.length > 0 ? ids : undefined)
      setToast(ids.length > 0 ? t('inventory.syncToastSelected', { count: resp.syncedCount, plural: resp.syncedCount === 1 ? '' : 's' }) : t('inventory.syncToastAll'))
      await loadAssets()
      setSelectedIds(new Set())
    } finally {
      setSyncing(false)
    }
  }

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setDeleting(true)
    try {
      await assetService.bulkRemove(ids)
      setSelectedIds(new Set())
      setShowDeleteConfirm(false)
      await loadAssets()
    } finally {
      setDeleting(false)
    }
  }

  const handleExportCsv = async () => {
    setExporting(true)
    try {
      const resp = await assetService.list({ search, department, location, deviceType, page: 1, pageSize: 100000 })
      const headers = [
        'Old Host Name', 'Host Name', 'IP Address', 'Device Type', 'Manufacturer', 'Model', 'Processor',
        'Memory (GB)', 'Disk Storage (GB)', 'Operating System', 'Serial Number', 'MAC Address', 'Location',
        'Last User', 'Owner', 'Department', 'Last Maintenance Date', 'Achieved By', 'Notes',
      ]
      const rows = resp.assets.map((a) => [
        a.oldHostName, a.hostName, a.ipAddress, a.deviceType, a.manufacturer, a.model, a.processor,
        a.memory ?? '', a.diskStorageGB ?? '', a.operatingSystem, a.serialNumber, a.macAddress, a.location,
        a.lastUser, a.owner, a.department, a.lastMaintenanceDate || '', a.achievedBy, (a.notes || '').replace(/\n/g, ' '),
      ])
      const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `asset-guardian-inventory-${new Date().toISOString().slice(0, 10)}.csv`
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
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{t('inventory.title')}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
            {t('inventory.subtitle', { filtered: total, total })}
            {selectedIds.size > 0 && ` · ${t('inventory.selectedSuffix', { count: selectedIds.size })}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {user?.role !== 'READ_ONLY_AUDITOR' && (
            <button type="button" className="btn-ghost" onClick={() => setShowImportModal(true)}>
              <IconUpload size={13} />
              {t('inventory.importFile')}
            </button>
          )}
          {user?.role !== 'READ_ONLY_AUDITOR' && (
            <button type="button" className="btn-ghost" onClick={handleSync} disabled={syncing}>
              <IconSync size={13} spin={syncing} />
              {syncing ? t('inventory.syncing') : selectedIds.size > 0 ? t('inventory.syncSelected', { count: selectedIds.size }) : t('inventory.syncData')}
            </button>
          )}
          <button type="button" className="btn-ghost" onClick={handleExportCsv} disabled={exporting}>
            <IconDownload size={13} />
            {exporting ? t('common.loading') : t('inventory.exportCsv')}
          </button>
          <div style={{ position: 'relative' }} ref={columnPickerRef}>
            <button type="button" className="btn-ghost" onClick={() => setShowColumnPicker((v) => !v)}>
              <IconColumns size={13} />
              {t('inventory.columns')}
            </button>
            {showColumnPicker && (
              <div
                style={{
                  position: 'absolute',
                  insetInlineEnd: 0,
                  top: '110%',
                  zIndex: 30,
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  padding: 10,
                  width: 240,
                  maxHeight: 340,
                  overflowY: 'auto',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', padding: '4px 6px 8px' }}>
                  {t('inventory.columnsPickerTitle')}
                </div>
                {COLUMN_DEFS.map((col) => (
                  <label
                    key={col.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 6px',
                      fontSize: 12.5,
                      color: col.mandatory ? 'var(--text-secondary)' : 'var(--text-primary)',
                      cursor: col.mandatory ? 'default' : 'pointer',
                      borderRadius: 6,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={col.mandatory || visibleColumns.has(col.key)}
                      disabled={col.mandatory}
                      onChange={() => toggleColumn(col.key)}
                    />
                    {t(col.labelKey)}
                    {col.mandatory && <span style={{ fontSize: 10, marginInlineStart: 'auto' }}>{t('inventory.columnAlwaysShown')}</span>}
                  </label>
                ))}
              </div>
            )}
          </div>
          {user?.role !== 'READ_ONLY_AUDITOR' && (
            <button type="button" className="btn-primary" onClick={() => setShowAddModal(true)}>
              <IconPlus size={13} color="white" />
              {t('inventory.addAssetManually')}
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div style={{ backgroundColor: 'rgba(26,127,55,0.1)', color: '#1a7f37', fontSize: 12.5, fontWeight: 500, padding: '8px 14px', borderRadius: 8, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconCheck size={13} color="#1a7f37" />
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 220 }}>
          <span style={{ position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)' }}>
            <IconSearch />
          </span>
          <input
            className="input-base"
            style={{ paddingInlineStart: 32 }}
            placeholder={t('inventory.searchPlaceholder') ?? ''}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <select className="input-base" style={{ width: 180 }} value={department} onChange={(e) => setDepartment(e.target.value)}>
          <option value="All">{t('inventory.allDepartments')}</option>
          {dropdowns.departments.map((d) => (
            <option key={d.id} value={d.value}>
              {d.value}
            </option>
          ))}
        </select>
        <select className="input-base" style={{ width: 180 }} value={location} onChange={(e) => setLocation(e.target.value)}>
          <option value="All">{t('inventory.allLocations')}</option>
          {dropdowns.locations.map((l) => (
            <option key={l.id} value={l.value}>
              {l.value}
            </option>
          ))}
        </select>
        <select className="input-base" style={{ width: 170 }} value={deviceType} onChange={(e) => setDeviceType(e.target.value)}>
          <option value="All">{t('inventory.allDeviceTypes')}</option>
          {DEVICE_TYPES.map((dt) => (
            <option key={dt} value={dt}>
              {t(`deviceType.${dt}`, dt)}
            </option>
          ))}
        </select>
        {selectedIds.size > 0 && (
          <button type="button" className="btn-danger" onClick={() => setShowDeleteConfirm(true)}>
            <IconTrash size={12} /> {t('inventory.remove')} ({selectedIds.size})
          </button>
        )}
      </div>

      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 920 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-elevated)' }}>
                {user?.role !== 'READ_ONLY_AUDITOR' && (
                  <th style={{ padding: '10px 14px', textAlign: 'start', width: 36 }}>
                    <input type="checkbox" checked={isPageFullySelected} onChange={toggleSelectAllOnPage} />
                  </th>
                )}
                {activeColumns.map((col) => (
                  <th key={col.key} style={{ padding: '10px 14px', textAlign: 'start', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {t(col.labelKey)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={activeColumns.length + 1} style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {t('common.loading')}
                  </td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={activeColumns.length + 1} style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {t('inventory.noRecords')}
                  </td>
                </tr>
              ) : (
                assets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="table-row-hover"
                    style={{ borderBottom: '1px solid var(--border-faint)' }}
                    onClick={() => setSelectedAsset(asset)}
                  >
                    {user?.role !== 'READ_ONLY_AUDITOR' && (
                      <td style={{ padding: '10px 14px' }} onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(asset.id)} onChange={() => toggleSelect(asset.id)} />
                      </td>
                    )}
                    {activeColumns.map((col) => (
                      <td key={col.key} style={{ padding: '10px 14px', color: 'var(--text-body)' }}>
                        {col.render(asset)}
                      </td>
                    ))}
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

      {selectedAsset && (
        <AssetDrawer
          asset={selectedAsset}
          dropdowns={dropdowns}
          onClose={() => setSelectedAsset(null)}
          onUpdated={(updated) => {
            setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
            setSelectedAsset(updated)
          }}
        />
      )}

      {showAddModal && (
        <AddAssetModal
          dropdowns={dropdowns}
          onClose={() => setShowAddModal(false)}
          onCreated={() => { loadAssets() }}
        />
      )}

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImported={async (summary) => {
            setToast(t('inventory.importToast', { created: summary.created, updated: summary.updated, skipped: summary.skipped.length }))
            await loadAssets()
            setShowImportModal(false)
          }}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title={t('inventory.confirmDeleteTitle')}
          message={t('inventory.confirmDeleteMessage', { count: selectedIds.size })}
          confirmLabel={t('inventory.confirmDeleteButton')}
          submitting={deleting}
          onConfirm={handleBulkDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  )
}
