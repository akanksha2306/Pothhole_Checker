import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from 'shared'

import { sessionApi, type LoginIntent } from '@/lib/session-api'

export type AuthStatus = 'loading' | 'authed' | 'anon'

export interface AuthContextValue {
  user: User | null
  status: AuthStatus
  /** Exchanges a GIS ID token + intent hint for a session cookie. */
  signIn: (credential: string, intent: LoginIntent) => Promise<User>
  /** Clears the server session and local state (always ends up signed out). */
  signOut: () => Promise<void>
  /** Re-reads the session from GET /api/me. */
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Session store. The backend owns the session (httpOnly cookie), so this only
 * caches the `/api/me` answer in memory — there is deliberately no persistence
 * in localStorage for the user object.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  const refresh = useCallback(async () => {
    try {
      const me = await sessionApi.currentUser()
      setUser(me)
      setStatus('authed')
    } catch {
      setUser(null)
      setStatus('anon')
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const signIn = useCallback(async (credential: string, intent: LoginIntent) => {
    const signedIn = await sessionApi.signInWithGoogle(credential, intent)
    setUser(signedIn)
    setStatus('authed')
    return signedIn
  }, [])

  const signOut = useCallback(async () => {
    try {
      await sessionApi.signOut()
    } finally {
      setUser(null)
      setStatus('anon')
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, signIn, signOut, refresh }),
    [user, status, signIn, signOut, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>.')
  }
  return context
}

/** Landing route per role: admins go straight to triage, citizens to their list. */
export function roleHomePath(user: User | null): string {
  return user?.role === 'ADMIN' ? '/admin' : '/reports'
}
