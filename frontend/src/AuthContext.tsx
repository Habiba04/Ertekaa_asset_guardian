import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authService } from './services/authService'
import type { AdminUser } from './types'

interface AuthContextValue {
  user: AdminUser | null
  token: string | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  setSession: (token: string, user: AdminUser) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const TOKEN_KEY = 'ag_token'
const USER_KEY = 'ag_user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<AdminUser | null>(() => {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AdminUser) : null
  })
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    async function verifySession() {
      if (!token) {
        setIsLoading(false)
        return
      }
      try {
        const { user: freshUser } = await authService.me()
        setUser(freshUser)
        localStorage.setItem(USER_KEY, JSON.stringify(freshUser))
      } catch {
        setToken(null)
        setUser(null)
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      } finally {
        setIsLoading(false)
      }
    }
    verifySession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setSession = useCallback((newToken: string, newUser: AdminUser) => {
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(USER_KEY, JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }, [])

  const login = useCallback(
    async (username: string, password: string) => {
      const { token: newToken, user: newUser } = await authService.login(username, password)
      setSession(newToken, newUser)
    },
    [setSession]
  )

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, token, isLoading, login, logout, setSession }),
    [user, token, isLoading, login, logout, setSession]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
