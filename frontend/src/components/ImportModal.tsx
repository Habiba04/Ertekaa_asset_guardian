import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { assetService } from '../services/assetService'
import type { Asset } from '../types'
import { IconX, IconUpload } from './Icons'
import Portal from './Portal'

interface ImportModalProps {
  onClose: () => void
  onImported: (assets: Asset[]) => void
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
  operatingSystem?: string
  serialNumber?: string
  macAddress?: string
  location?: string
  lastUser?: string
  owner?: string
  department?: string
  lastMaintenanceDate?: string
  notes?: string
  [key: string]: unknown
}

function normalizeKeys(row: Record<string, unknown>): ParsedRow {
  const map: Record<string, string> = {
    'host name': 'hostName', hostname: 'hostName', name: 'hostName',
    'old host name': 'oldHostName', 'old name': 'oldHostName',
    'ip address': 'ipAddress', ip: 'ipAddress',
    'device type': 'deviceType', type: 'deviceType',
    manufacturer: 'manufacturer',
    model: 'model',
    processor: 'processor',
    memory: 'memory', 'memory (ram)': 'memory', ram: 'memory',
    'operating system': 'operatingSystem', os: 'operatingSystem',
    'serial number': 'serialNumber', serial: 'serialNumber',
    'mac address': 'macAddress', mac: 'macAddress',
    location: 'location',
    'last user': 'lastUser',
    owner: 'owner', 'owner (current)': 'owner',
    department: 'department', 'description / department': 'department', description: 'department',
    'last maintenance date': 'lastMaintenanceDate',
    notes: 'notes',
  }
  const normalized: ParsedRow = {}
  Object.entries(row).forEach(([key, value]) => {
    const cleanKey = map[key.trim().toLowerCase()] ?? key
    normalized[cleanKey] = typeof value === 'string' ? value.trim() : value
  })
  return normalized
}

export default function ImportModal({ onClose, onImported }: ImportModalProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')

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
        error: () => setError('Failed to parse CSV file.'),
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
          setError('Failed to parse Excel file.')
        }
      }
      reader.readAsArrayBuffer(file)
    }
  }

  const handleImport = async () => {
    setImporting(true)
    try {
      const { assets } = await assetService.bulkImport(rows as unknown as Record<string, unknown>[])
      onImported(assets)
    } finally {
      setImporting(false)
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
          width: 500,
          maxWidth: '100%',
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

        <div style={{ padding: 22 }}>
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
        </div>

        <div style={{ padding: 16, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn-ghost" onClick={onClose}>
            {t('importModal.cancel')}
          </button>
          <button type="button" className="btn-primary" onClick={handleImport} disabled={rows.length === 0 || importing}>
            {importing ? t('common.loading') : t('importModal.import', { count: rows.length })}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  )
}
