import { useEffect, useMemo, useState } from 'react'
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
import { IconSearch, IconUpload, IconSync, IconPlus, IconDownload, IconTrash } from '../components/Icons'
import { useAuth } from '../AuthContext'

const EMPTY_DROPDOWNS: DropdownState = { departments: [], locations: [] }
const DEVICE_TYPES: DeviceType[] = ['Laptop', 'PC', 'Switch', 'Server', 'Printer', 'Router', 'Other']

export default function InventoryScreen() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [assets, setAssets] = useState<Asset[]>([])
  const [dropdowns, setDropdowns] = useState<DropdownState>(EMPTY_DROPDOWNS)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('All')
  const [location, setLocation] = useState('All')
  const [deviceType, setDeviceType] = useState('All')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadAssets = async () => {
    setLoading(true)
    try {
      const resp = await assetService.list({})
      setAssets(resp.assets)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAssets()
    settingsService.listDropdowns().then(setDropdowns).catch(() => setDropdowns(EMPTY_DROPDOWNS))
  }, [])

  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(''), 3200)
    return () => clearTimeout(timeout)
  }, [toast])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return assets.filter((a) => {
      const matchesSearch =
        !term ||
        [
          a.hostName, a.oldHostName, a.owner, a.lastUser, a.model, a.manufacturer,
          a.serialNumber, a.macAddress, a.ipAddress, a.operatingSystem, a.processor,
          a.location, a.department, a.notes, a.achievedBy,
        ].some((field) => field?.toLowerCase().includes(term))
      const matchesDept = department === 'All' || a.department === department
      const matchesLoc = location === 'All' || a.location === location
      const matchesType = deviceType === 'All' || a.deviceType === deviceType
      return matchesSearch && matchesDept && matchesLoc && matchesType
    })
  }, [assets, search, department, location, deviceType])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((a) => a.id)))
    }
  }

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

  const handleExportCsv = () => {
    const headers = [
      'Old Host Name', 'Host Name', 'IP Address', 'Device Type', 'Manufacturer', 'Model', 'Processor',
      'Memory (GB)', 'Disk Storage (GB)', 'Operating System', 'Serial Number', 'MAC Address', 'Location', 'Last User', 'Owner',
      'Department', 'Data Source', 'Last Maintenance Date', 'Achieved By', 'Notes',
    ]
    const rows = filtered.map((a) => [
      a.oldHostName, a.hostName, a.ipAddress, a.deviceType, a.manufacturer, a.model, a.processor,
      a.memory ?? '', a.diskStorageGB ?? '', a.operatingSystem, a.serialNumber, a.macAddress, a.location, a.lastUser, a.owner,
      a.department, a.dataSource, a.lastMaintenanceDate || '', a.achievedBy, (a.notes || '').replace(/\n/g, ' '),
    ])
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `asset-guardian-inventory-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page-padding">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{t('inventory.title')}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
            {t('inventory.subtitle', { filtered: filtered.length, total: assets.length })}
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
          <button type="button" className="btn-ghost" onClick={handleExportCsv}>
            <IconDownload size={13} />
            {t('inventory.exportCsv')}
          </button>
          {user?.role !== 'READ_ONLY_AUDITOR' && (
            <button type="button" className="btn-primary" onClick={() => setShowAddModal(true)}>
              <IconPlus size={13} color="white" />
              {t('inventory.addAssetManually')}
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div style={{ backgroundColor: 'rgba(26,127,55,0.1)', color: '#1a7f37', fontSize: 12.5, fontWeight: 500, padding: '8px 14px', borderRadius: 8, marginBottom: 14 }}>
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
              {t(`deviceType.${dt}`)}
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
                    <input type="checkbox" checked={filtered.length > 0 && selectedIds.size === filtered.length} onChange={toggleSelectAll} />
                  </th>
                )}
                <th style={{ padding: '10px 14px', textAlign: 'start', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('inventory.colHostName')}</th>
                <th style={{ padding: '10px 14px', textAlign: 'start', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('inventory.colType')}</th>
                <th style={{ padding: '10px 14px', textAlign: 'start', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('inventory.colManufacturer')}</th>
                <th style={{ padding: '10px 14px', textAlign: 'start', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('inventory.colModel')}</th>
                <th style={{ padding: '10px 14px', textAlign: 'start', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('inventory.colOs')}</th>
                <th style={{ padding: '10px 14px', textAlign: 'start', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('inventory.colStatus')}</th>
                <th style={{ padding: '10px 14px', textAlign: 'start', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('inventory.colOwner')}</th>
                <th style={{ padding: '10px 14px', textAlign: 'start', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('inventory.colDepartment')}</th>
                <th style={{ padding: '10px 14px', textAlign: 'start', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('inventory.colLocation')}</th>
                <th style={{ padding: '10px 14px', textAlign: 'start', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('inventory.colLastSeen')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {t('common.loading')}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {t('inventory.noRecords')}
                  </td>
                </tr>
              ) : (
                filtered.map((asset) => (
                  <tr
                    key={asset.id}
                    className="table-row-hover"
                    style={{ borderBottom: '1px solid var(--border-faint)' }}
                    onClick={() => setSelectedAsset(asset)}
                  >
                    {(user?.role !== 'READ_ONLY_AUDITOR' &&
                      <td style={{ padding: '10px 14px' }} onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(asset.id)} onChange={() => toggleSelect(asset.id)} />
                      </td>
                    )}
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>{asset.hostName}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <DeviceTypeBadge type={asset.deviceType} />
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-body)' }}>{asset.manufacturer || '—'}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-body)' }}>{asset.model || '—'}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-body)' }}>{asset.operatingSystem || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <StatusBadge status={asset.status} />
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-body)' }}>{asset.owner || '—'}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-body)' }}>{asset.department || '—'}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-body)' }}>{asset.location || '—'}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {new Date(asset.lastSeen).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
          onCreated={(created) => setAssets((prev) => [created, ...prev])}
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
