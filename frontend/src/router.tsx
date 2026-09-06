import { lazy, type ComponentType } from 'react'
import { Navigate, createBrowserRouter } from 'react-router'

import { PageShell } from '@/components/layout/page-shell'
import { RouteErrorScreen } from '@/components/layout/route-error'
import { RedirectIfAuthenticated, RequireAdmin, RequireAuth } from '@/features/auth/guards'

/** sessionStorage flag guarding the reload below against loops. */
const RELOAD_FLAG = 'pw:reloaded-for-new-build'

/**
 * A deploy replaces every chunk's hash, so a tab left open across a deploy
 * fails its next lazy import ("Failed to fetch dynamically imported module").
 * One clean reload picks up the fresh build — the service worker has already
 * activated it — and the flag stops a second reload if that build is broken.
 */
function lazyRetry<T extends ComponentType<unknown>>(
  load: () => Promise<{ default: T }>,
): ReturnType<typeof lazy> {
  return lazy(() =>
    load()
      .then((mod) => {
        sessionStorage.removeItem(RELOAD_FLAG)
        return mod
      })
      .catch((error: unknown) => {
        if (sessionStorage.getItem(RELOAD_FLAG)) throw error
        sessionStorage.setItem(RELOAD_FLAG, '1')
        window.location.reload()
        // Never resolves: the reload takes over the document.
        return new Promise<{ default: T }>(() => {})
      }),
  )
}

/**
 * Route components are lazy-loaded: the login screen ships without the report
 * form, map code stays out of every other chunk, and citizens never download
 * the admin console.
 */
const LoginPage = lazyRetry(() =>
  import('@/features/auth/pages/login-page').then((m) => ({ default: m.LoginPage })),
)
const MapHomePage = lazyRetry(() =>
  import('@/features/map/pages/map-home-page').then((m) => ({ default: m.MapHomePage })),
)
const PotholeListPage = lazyRetry(() =>
  import('@/features/potholes/pages/pothole-list-page').then((m) => ({
    default: m.PotholeListPage,
  })),
)
const PotholeDetailPage = lazyRetry(() =>
  import('@/features/potholes/pages/pothole-detail-page').then((m) => ({
    default: m.PotholeDetailPage,
  })),
)
const CommunityPage = lazyRetry(() =>
  import('@/features/community/pages/community-page').then((m) => ({ default: m.CommunityPage })),
)
const NewReportPage = lazyRetry(() =>
  import('@/features/reports/pages/new-report-page').then((m) => ({ default: m.NewReportPage })),
)
const MyReportsPage = lazyRetry(() =>
  import('@/features/reports/pages/my-reports-page').then((m) => ({ default: m.MyReportsPage })),
)
const AdminDashboardPage = lazyRetry(() =>
  import('@/features/admin/pages/admin-dashboard-page').then((m) => ({
    default: m.AdminDashboardPage,
  })),
)
const AdminPotholeDetailPage = lazyRetry(() =>
  import('@/features/admin/pages/admin-pothole-detail-page').then((m) => ({
    default: m.AdminPotholeDetailPage,
  })),
)

/**
 * Authorisation is enforced by the backend on every request (the httpOnly
 * cookie is the source of truth). These guards only route citizens away from
 * admin screens and signed-in users away from the login page.
 */
export const router = createBrowserRouter([
  {
    element: <PageShell />,
    errorElement: <RouteErrorScreen />,
    children: [
      {
        path: '/login',
        element: (
          <RedirectIfAuthenticated>
            <LoginPage />
          </RedirectIfAuthenticated>
        ),
      },
      {
        // The app's front door.
        path: '/',
        element: (
          <RequireAuth>
            <MapHomePage />
          </RequireAuth>
        ),
      },
      {
        path: '/potholes',
        element: (
          <RequireAuth>
            <PotholeListPage />
          </RequireAuth>
        ),
      },
      {
        path: '/potholes/:idOrHumanCode',
        element: (
          <RequireAuth>
            <PotholeDetailPage />
          </RequireAuth>
        ),
      },
      {
        path: '/community',
        element: (
          <RequireAuth>
            <CommunityPage />
          </RequireAuth>
        ),
      },
      {
        path: '/report/new',
        element: (
          <RequireAuth>
            <NewReportPage />
          </RequireAuth>
        ),
      },
      {
        path: '/reports',
        element: (
          <RequireAuth>
            <MyReportsPage />
          </RequireAuth>
        ),
      },
      {
        path: '/admin',
        element: (
          <RequireAdmin>
            <AdminDashboardPage />
          </RequireAdmin>
        ),
      },
      {
        path: '/admin/potholes/:idOrHumanCode',
        element: (
          <RequireAdmin>
            <AdminPotholeDetailPage />
          </RequireAdmin>
        ),
      },
      // The old report-centric admin detail is gone; the pothole page replaces it.
      { path: '/admin/reports/:id', element: <Navigate to="/admin" replace /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
