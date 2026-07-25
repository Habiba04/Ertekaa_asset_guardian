import type { ReactNode } from 'react'

interface MetricCardProps {
  label: string
  sublabel: string
  value: number | string
  icon: ReactNode
  accentColor: string
}

export default function MetricCard({ label, sublabel, value, icon, accentColor }: MetricCardProps) {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</span>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 7,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${accentColor}14`,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{sublabel}</div>
    </div>
  )
}
