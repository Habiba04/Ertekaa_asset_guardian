import { useTranslation } from 'react-i18next'
import type { AssetStatus } from '../types'

const STYLES: Record<AssetStatus, { bg: string; color: string; dot: string; labelKey: string }> = {
  online: { bg: 'rgba(26,127,55,0.1)', color: '#1a7f37', dot: '#1a7f37', labelKey: 'inventory.statusOnline' },
  remote: { bg: 'rgba(154,103,0,0.1)', color: '#9a6700', dot: '#9a6700', labelKey: 'inventory.statusRemote' },
  unregistered: { bg: 'rgba(207,34,46,0.1)', color: '#cf222e', dot: '#cf222e', labelKey: 'inventory.statusRogue' },
}

export default function StatusBadge({ status }: { status: AssetStatus }) {
  const { t } = useTranslation()
  const style = STYLES[status] ?? STYLES.online

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 9px',
        borderRadius: 12,
        fontSize: 11.5,
        fontWeight: 600,
        backgroundColor: style.bg,
        color: style.color,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: style.dot, flexShrink: 0 }} />
      {t(style.labelKey)}
    </span>
  )
}
