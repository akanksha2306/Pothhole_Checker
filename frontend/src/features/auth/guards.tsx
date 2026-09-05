import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

import { FullPageLoader } from '@/components/molecules/full-page-loader'
import { roleHomePath, useAuth } from '@/features/auth/auth-provider'

/**
 * Route guards. The backend still enforces every rule (the cookie is the source
 * of truth) — these only keep citizens out of screens that cannot work for them.
 */

/** Anonymous visitors are sent to sign-in, remembering where they were headed. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <FullPageLoader label="Checking your session…" />
  }
  if (status === 'anon') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}

/** Admin-only screens bounce citizens back to their own reports. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <FullPageLoader label="Checking your session…" />
  }
  if (status === 'anon') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/reports" replace />
  }
  return <>{children}</>
}

/** Signed-in users have no business on the login screen. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { user, status } = useAuth()

  if (status === 'loading') {
    return <FullPageLoader label="Checking your session…" />
  }
  if (status === 'authed') {
    return <Navigate to={roleHomePath(user)} replace />
  }
  return <>{children}</>
}
