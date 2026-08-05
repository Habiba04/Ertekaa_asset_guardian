import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import { authService } from './services/authService'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import LoginScreen from './pages/LoginScreen'
import SetupWizard from './pages/SetupWizard'
import DashboardScreen from './pages/DashboardScreen'
import InventoryScreen from './pages/InventoryScreen'
import StagingQueueScreen from './pages/StagingQueueScreen'
import AuditLogsScreen from './pages/AuditLogsScreen'
import SettingsScreen from './pages/SettingsScreen'

function SetupGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'incomplete' | 'complete'>('checking')

  useEffect(() => {
    let cancelled = false
    authService
      .getSetupStatus()
      .then((resp) => {
        if (!cancelled) setStatus(resp.isSetupComplete ? 'complete' : 'incomplete')
      })
      .catch(() => {
        if (!cancelled) setStatus('complete')
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (status === 'checking') {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
        Loading…
      </div>
    )
  }

  if (status === 'incomplete') {
    return <Navigate to="/setup" replace />
  }

  return <>{children}</>
}

function RequireSetupComplete({ children }: { children: React.ReactNode }) {
  return <SetupGate>{children}</SetupGate>
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/setup" element={<SetupWizard />} />
      <Route
        path="/login"
        element={
          <RequireSetupComplete>
            <LoginScreen />
          </RequireSetupComplete>
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardScreen />} />
        <Route path="inventory" element={<InventoryScreen />} />
        <Route
          path="staging-queue"
          element={
            user?.role === 'READ_ONLY_AUDITOR' ? <Navigate to="/dashboard" replace /> : <StagingQueueScreen />
          }
        />
        <Route path="audit-logs" element={<AuditLogsScreen />} />
        <Route
          path="settings"
          element={
            user?.role === 'READ_ONLY_AUDITOR' ? <Navigate to="/dashboard" replace /> : <SettingsScreen />
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
