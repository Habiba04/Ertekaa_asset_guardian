import { useTranslation } from 'react-i18next'
import type { DeviceType } from '../types'
import { IconServer } from './Icons'

const COLORS: Record<DeviceType, string> = {
  Laptop: '#0969da',
  PC: '#6639ba',
  Switch: '#9a6700',
  Server: '#cf222e',
  Printer: '#1a7f37',
  Router: '#bf3989',
  Other: '#656d76',
}

export default function DeviceTypeBadge({ type }: { type: DeviceType }) {
  const { t } = useTranslation()
  const color = COLORS[type] ?? COLORS.Other

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 8px',
        borderRadius: 5,
        fontSize: 11.5,
        fontWeight: 500,
        backgroundColor: `${color}14`,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      <IconServer size={11} color={color} />
      {t(`deviceType.${type}`)}
    </span>
  )
}
