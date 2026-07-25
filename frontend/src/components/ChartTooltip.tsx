interface ChartTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number | string; color?: string; fill?: string }>
  label?: string
}

export default function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '8px 12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        fontSize: 12,
      }}
    >
      {label && <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>{label}</div>}
      {payload.map((entry, idx) => (
        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: entry.color || entry.fill || '#0969da',
              flexShrink: 0,
            }}
          />
          <span>
            {entry.name}: <strong style={{ color: 'var(--text-primary)' }}>{entry.value}</strong>
          </span>
        </div>
      ))}
    </div>
  )
}
