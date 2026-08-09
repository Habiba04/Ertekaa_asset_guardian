import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { assetService, type BulkImportResponse } from '../services/assetService'
import { IconX, IconUpload, IconDownload, IconCheck } from './Icons'
import Portal from './Portal'

interface ImportModalProps {
  onClose: () => void
  onImported: (summary: BulkImportResponse) => void
}

interface ParsedRow {
  hostName?: string
  oldHostName?: string
  ipAddress?: string
  deviceType?: string
  manufacturer?: string
  model?: string
  processor?: string
  memory?: string
  diskStorageGB?: string
  operatingSystem?: string
  serialNumber?: string
  macAddress?: string
  location?: string
  lastUser?: string
  owner?: string
  department?: string
  lastMaintenanceDate?: string
  achievedBy?: string
  notes?: string
  [key: string]: unknown
}

// Matches the columns actually used in the real office inventory
// spreadsheet. Required: Device Type, Serial #, Location, Department.
// Everything else — including Name/Host Name and MAC Addresses — is
// optional; a missing or broken hostname (e.g. Excel's "#NAME?" error)
// gets auto-generated the same way manually-added assets do.
const TEMPLATE_HEADERS = [
  'Old Name', 'Name', 'IP Addresses', 'Device Type', 'Manufacturer', 'Model', 'processor',
  'Memory', 'Disk Storage (GB)', 'Operating System', 'Serial #', 'MAC Addresses', 'Location',
  'lastUser', 'Owner', 'Department', 'Q1 Maintenance Date', 'Achieved by', 'notes',
]

const REQUIRED_HEADERS = ['Device Type', 'Serial #', 'Location', 'Department']

const TEMPLATE_EXAMPLE_ROW = [
  'OLD-PC-014', 'HQENGINEERING-LAPTOP001', '192.168.1.42', 'LT', 'Dell', 'Latitude 5420', 'Intel Core i7-1165G7',
  '16', '512', 'Windows 11 Pro', 'SN123456789', 'AA:BB:CC:DD:EE:FF', 'HQ-HO',
  'jane.doe', 'Jane Doe', 'Engineering', '2026-01-15', 'Mohamed Emad', 'Assigned during onboarding',
]

// Maps every known column-name variant (both the app's own older export
// format and the real office spreadsheet's headers, including its typo
// "Maintnenace") down to a single canonical field name.
const HEADER_MAP: Record<string, string> = {
  'host name': 'hostName', hostname: 'hostName', name: 'hostName',
  'old host name': 'oldHostName', 'old name': 'oldHostName',
  'ip address': 'ipAddress', 'ip addresses': 'ipAddress', ip: 'ipAddress',
  'device type': 'deviceType', type: 'deviceType',
  manufacturer: 'manufacturer',
  model: 'model',
  processor: 'processor',
  memory: 'memory', 'memory (ram)': 'memory', ram: 'memory', 'memory (gb)': 'memory',
  'disk storage': 'diskStorageGB', 'disk storage (gb)': 'diskStorageGB', storage: 'diskStorageGB', 'disk (gb)': 'diskStorageGB',
  'operating system': 'operatingSystem', os: 'operatingSystem',
  'serial number': 'serialNumber', 'serial #': 'serialNumber', serial: 'serialNumber',
  'mac address': 'macAddress', 'mac addresses': 'macAddress', mac: 'macAddress',
  location: 'location',
  'last user': 'lastUser', lastuser: 'lastUser',
  owner: 'owner', 'owner (current)': 'owner',
  department: 'department', 'description / department': 'department', description: 'department',
  'last maintenance date': 'lastMaintenanceDate',
  'q1 maintenance date': 'lastMaintenanceDate', 'q1 maintnenace date': 'lastMaintenanceDate',
  'achieved by': 'achievedBy', achievedby: 'achievedBy',
}

// These two source column names both map to "notes" and get merged
// together (rather than one silently overwriting the other), since the
// real spreadsheet has both "Note" and "notes" as separate columns.
const NOTE_SOURCE_KEYS = ['note', 'notes'];

function normalizeKeys(row: Record<string, unknown>): ParsedRow {
  const normalized: ParsedRow = {}
  const noteParts: string[] = []

  Object.entries(row).forEach(([rawKey, value]) => {
    const key = rawKey.trim().toLowerCase()
    const stringValue = typeof value === 'string' ? value.trim() : value

    if (NOTE_SOURCE_KEYS.includes(key)) {
      if (stringValue && String(stringValue).trim()) noteParts.push(String(stringValue).trim())
      return
    }

    const mappedKey = HEADER_MAP[key] ?? rawKey
    normalized[mappedKey] = stringValue
  })

  if (noteParts.length > 0) {
    normalized.notes = noteParts.join(' | ')
  }

  return normalized
}

export default function ImportModal({ onClose, onImported }: ImportModalProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<BulkImportResponse | null>(null)

  const handleFile = (file: File) => {
    setError('')
    setFileName(file.name)
    const isCsv = file.name.toLowerCase().endsWith('.csv')

    if (isCsv) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsed = (results.data as Record<string, unknown>[]).map(normalizeKeys)
          setRows(parsed)
        },
        error: () => setError(t('importModal.parseErrorCsv')),
      })
    } else {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheet = workbook.Sheets[workbook.SheetNames[0]]
          const json = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[]
          setRows(json.map(normalizeKeys))
        } catch {
          setError(t('importModal.parseErrorExcel'))
        }
      }
      reader.readAsArrayBuffer(file)
    }
  }

  const handleImport = async () => {
    setImporting(true)
    setError('')
    try {
      const summary = await assetService.bulkImport(rows as unknown as Record<string, unknown>[])
      setResult(summary)
    } catch {
      setError(t('importModal.importFailed'))
    } finally {
      setImporting(false)
    }
  }

  const handleDownloadTemplate = () => {
    const csv = [TEMPLATE_HEADERS, TEMPLATE_EXAMPLE_ROW]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'asset-guardian-import-template.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleDone = () => {
    if (result) onImported(result)
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
          width: 560,
          maxWidth: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 48px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text-primary)' }}>{t('importModal.title')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{t('importModal.subtitle')}</div>
          </div>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <IconX size={18} />
          </button>
        </div>

        {result ? (
          <div style={{ padding: 22, overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center', marginBottom: 18 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: 'rgba(26,127,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconCheck size={20} color="#1a7f37" />
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-primary)' }}>{t('importModal.resultsTitle')}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              <div style={{ backgroundColor: 'rgba(26,127,55,0.06)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1a7f37' }}>{result.created}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('importModal.created')}</div>
              </div>
              <div style={{ backgroundColor: 'rgba(9,105,218,0.06)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#0969da' }}>{result.updated}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('importModal.updated')}</div>
              </div>
              <div style={{ backgroundColor: 'rgba(207,34,46,0.06)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#cf222e' }}>{result.skipped.length}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('importModal.skipped')}</div>
              </div>
            </div>
            {result.skipped.length > 0 && (
              <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                {result.skipped.map((s, idx) => (
                  <div key={idx} style={{ padding: '8px 12px', fontSize: 11.5, borderBottom: idx !== result.skipped.length - 1 ? '1px solid var(--border-faint)' : 'none' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{String(s.row.hostName || s.row.serialNumber || '—')}</span>
                    <span style={{ color: '#cf222e', marginInlineStart: 6 }}>{s.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: 22, overflowY: 'auto' }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={handleDownloadTemplate}
              style={{ marginBottom: 14, width: '100%', justifyContent: 'center' }}
            >
              <IconDownload size={13} />
              {t('importModal.downloadTemplate')}
            </button>

            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginBottom: 14, backgroundColor: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 12px' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{t('importModal.requiredLabel')}:</strong> {REQUIRED_HEADERS.join(', ')}.{' '}
              {t('importModal.everythingElseOptional')}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border)',
                borderRadius: 10,
                padding: 32,
                textAlign: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--bg-elevated)',
              }}
            >
              <IconUpload size={22} />
              <div style={{ fontSize: 13, marginTop: 10 }}>{fileName || t('importModal.dropHint')}</div>
              {rows.length > 0 && (
                <div style={{ fontSize: 12, marginTop: 6, color: '#1a7f37', fontWeight: 600 }}>
                  {t('importModal.rowsFound', { count: rows.length })}
                </div>
              )}
            </div>
            {error && <div style={{ fontSize: 12, color: '#cf222e', marginTop: 10 }}>{error}</div>}
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 10 }}>{t('importModal.dedupeNotice')}</div>
          </div>
        )}

        <div style={{ padding: 16, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {result ? (
            <button type="button" className="btn-primary" onClick={handleDone}>
              {t('common.close')}
            </button>
          ) : (
            <>
              <button type="button" className="btn-ghost" onClick={onClose}>
                {t('importModal.cancel')}
              </button>
              <button type="button" className="btn-primary" onClick={handleImport} disabled={rows.length === 0 || importing}>
                {importing ? t('common.loading') : t('importModal.import', { count: rows.length })}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
    </Portal>
  )
}
