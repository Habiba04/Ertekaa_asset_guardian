import { useTranslation } from 'react-i18next'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  pageSizeOptions?: number[]
}

export default function Pagination({
  page, totalPages, total, pageSize, onPageChange, onPageSizeChange, pageSizeOptions = [25, 50, 100, 200],
}: PaginationProps) {
  const { t } = useTranslation()

  if (total === 0) return null

  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, total)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10,
        padding: '12px 14px',
        borderTop: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
        <span>{t('pagination.showingRange', { start: startItem, end: endItem, total })}</span>
        <select
          className="input-base"
          style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }}
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {t('pagination.perPage', { count: size })}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          className="btn-ghost"
          style={{ padding: '5px 10px', fontSize: 12 }}
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
        >
          «
        </button>
        <button
          type="button"
          className="btn-ghost"
          style={{ padding: '5px 10px', fontSize: 12 }}
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          {t('pagination.previous')}
        </button>
        <span style={{ fontSize: 12, color: 'var(--text-body)', padding: '0 6px', whiteSpace: 'nowrap' }}>
          {t('pagination.pageOf', { page, totalPages })}
        </span>
        <button
          type="button"
          className="btn-ghost"
          style={{ padding: '5px 10px', fontSize: 12 }}
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          {t('pagination.next')}
        </button>
        <button
          type="button"
          className="btn-ghost"
          style={{ padding: '5px 10px', fontSize: 12 }}
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
        >
          »
        </button>
      </div>
    </div>
  )
}
