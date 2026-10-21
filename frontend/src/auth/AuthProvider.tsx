import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as authApi from '../api/auth.ts'
import { setUnauthorizedHandler } from '../api/client.ts'
import { AuthContext, type AuthContextValue } from './AuthContext.ts'
import { clearSession, loadSession, saveSession } from './storage.ts'
import type { AuthSession } from './types.ts'

function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(loadSession)

  const startSession = useCallback((next: AuthSession) => {
    saveSession(next)
    setSession(next)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setSession(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  useEffect(() => {
    if (!session) return

    const remaining = new Date(session.expiresAt).getTime() - Date.now()
    const timer = setTimeout(logout, Math.max(remaining, 0))
    return () => clearTimeout(timer)
  }, [session, logout])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      isAdmin: session?.user.roles.includes('Admin') ?? false,
      login: async (input) => startSession(await authApi.login(input)),
      register: async (input) => startSession(await authApi.register(input)),
      logout,
    }),
    [session, startSession, logout],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export default AuthProvider
