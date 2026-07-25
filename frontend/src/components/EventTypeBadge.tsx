import type { EventCategory } from '../types'

const STYLES: Record<EventCategory, { bg: string; color: string }> = {
  created: { bg: 'rgba(26,127,55,0.1)', color: '#1a7f37' },
  updated: { bg: 'rgba(9,105,218,0.1)', color: '#0969da' },
  checkin: { bg: 'rgba(102,57,186,0.1)', color: '#6639ba' },
  alert: { bg: 'rgba(207,34,46,0.1)', color: '#cf222e' },
  deleted: { bg: 'rgba(207,34,46,0.1)', color: '#cf222e' },
  approved: { bg: 'rgba(26,127,55,0.1)', color: '#1a7f37' },
}

export default function EventTypeBadge({ category, label }: { category: EventCategory; label: string }) {
  const style = STYLES[category] ?? STYLES.updated
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 9px',
        borderRadius: 12,
        fontSize: 11.5,
        fontWeight: 600,
        backgroundColor: style.bg,
        color: style.color,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}
