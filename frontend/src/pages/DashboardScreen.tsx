import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { assetService } from '../services/assetService'
import { auditService } from '../services/auditService'
import type { Asset, AuditLogEntry } from '../types'
import MetricCard from '../components/MetricCard'
import ChartTooltip from '../components/ChartTooltip'
import EventTypeBadge from '../components/EventTypeBadge'
import { IconList, IconGrid, IconActivity, IconAlertTriangle } from '../components/Icons'
import { useMediaQuery } from '../hooks/useMediaQuery'

const STATUS_COLORS: Record<string, string> = { online: '#1a7f37', remote: '#9a6700', unregistered: '#cf222e' }
const DEPT_COLORS = ['#0969da', '#6639ba', '#1a7f37', '#9a6700', '#cf222e', '#bf3989', '#656d76']

export default function DashboardScreen() {
  const { t, i18n } = useTranslation()
  const isTablet = useMediaQuery('(max-width: 900px)')
  const isMobile = useMediaQuery('(max-width: 560px)')
  const [assets, setAssets] = useState<Asset[]>([])
  const [recentActivity, setRecentActivity] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [assetsResp, logsResp] = await Promise.all([
          assetService.list({}),
          auditService.list({}),
        ])
        if (cancelled) return
        setAssets(assetsResp.assets)
        setRecentActivity(logsResp.logs.slice(0, 6))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 60000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const stats = useMemo(() => {
    const total = assets.length
    const online = assets.filter((a) => a.status === 'online').length
    const remote = assets.filter((a) => a.status === 'remote').length
    const unregistered = assets.filter((a) => a.status === 'unregistered').length
    return { total, online, remote, unregistered }
  }, [assets])

  const statusChartData = useMemo(
    () => [
      { name: t('dashboard.statusActive'), value: stats.online, key: 'online' },
      { name: t('dashboard.statusRemote'), value: stats.remote, key: 'remote' },
      { name: t('dashboard.statusUnregistered'), value: stats.unregistered, key: 'unregistered' },
    ],
    [stats, t]
  )

  const osChartData = useMemo(() => {
    const counts: Record<string, number> = {}
    assets.forEach((a) => {
      const os = (a.operatingSystem || 'Unknown').split(' ').slice(0, 2).join(' ')
      counts[os] = (counts[os] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [assets])

  const deptChartData = useMemo(() => {
    const counts: Record<string, number> = {}
    assets.forEach((a) => {
      const dept = a.department || 'Unassigned'
      counts[dept] = (counts[dept] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [assets])

  return (
    <div className="page-padding">
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{t('dashboard.title')}</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
          {t('dashboard.subtitle', { date: new Date().toLocaleTimeString(i18n.language) })}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: 14,
          marginBottom: 20,
        }}
      >
        <MetricCard
          label={t('dashboard.metricTotalFleet')}
          sublabel={t('dashboard.metricTotalFleetSub')}
          value={loading ? '—' : stats.total}
          icon={<IconList size={15} color="#0969da" />}
          accentColor="#0969da"
        />
        <MetricCard
          label={t('dashboard.metricActive')}
          sublabel={t('dashboard.metricActiveSub')}
          value={loading ? '—' : stats.online}
          icon={<IconGrid size={15} color="#1a7f37" />}
          accentColor="#1a7f37"
        />
        <MetricCard
          label={t('dashboard.metricRemote')}
          sublabel={t('dashboard.metricRemoteSub')}
          value={loading ? '—' : stats.remote}
          icon={<IconActivity size={15} color="#9a6700" />}
          accentColor="#9a6700"
        />
        <MetricCard
          label={t('dashboard.metricUnregistered')}
          sublabel={t('dashboard.metricUnregisteredSub')}
          value={loading ? '—' : stats.unregistered}
          icon={<IconAlertTriangle size={15} color="#cf222e" />}
          accentColor="#cf222e"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 18 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{t('dashboard.statusBreakdown')}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginBottom: 8 }}>{t('dashboard.statusBreakdownSub')}</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusChartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {statusChartData.map((entry) => (
                  <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 18 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{t('dashboard.osDistribution')}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginBottom: 8 }}>{t('dashboard.osDistributionSub')}</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={osChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-faint)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" fill="#0969da" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr', gap: 14 }}>
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 18 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{t('dashboard.deptDistribution')}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginBottom: 8 }}>{t('dashboard.deptDistributionSub')}</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={deptChartData} dataKey="value" nameKey="name" outerRadius={85} paddingAngle={2}>
                {deptChartData.map((entry, idx) => (
                  <Cell key={entry.name} fill={DEPT_COLORS[idx % DEPT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{t('dashboard.recentActivity')}</div>
            <Link to="/audit-logs" style={{ fontSize: 12, color: '#0969da', fontWeight: 600, textDecoration: 'none' }}>
              {t('dashboard.viewAllLogs')}
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            {recentActivity.length === 0 && (
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{t('common.loading')}</div>
            )}
            {recentActivity.map((entry) => (
              <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: '1px solid var(--border-faint)' }}>
                <EventTypeBadge category={entry.eventCategory} label={entry.eventType} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {entry.hostname}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{entry.userSource}</div>
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {new Date(entry.timestamp).toLocaleTimeString(i18n.language)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
