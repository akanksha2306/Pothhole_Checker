import { LogOut as LogOutIcon, MapPin } from 'lucide-react'
import { Suspense, type ReactNode } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'

import { BottomNav } from '@/components/layout/bottom-nav'
import { FullPageLoader } from '@/components/molecules/full-page-loader'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-provider'
import { cn } from '@/lib/utils'

function NavLinkItem({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="rounded-lg px-3 py-2 text-body-md font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {label}
    </Link>
  )
}

interface PageShellProps {
  /** Route content. Omitted when used as a React Router layout route. */
  children?: ReactNode
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function BrandMark({ to, compact = false }: { to: string; compact?: boolean }) {
  return (
    <Link to={to} className="flex items-center gap-2">
      <span
        className={cn(
          'flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow',
          compact ? 'size-8' : 'size-9',
        )}
      >
        <MapPin className={compact ? 'size-4' : 'size-5'} aria-hidden="true" />
      </span>
      {!compact && (
        <span className="font-heading text-headline-sm tracking-tight text-foreground">
          PotholeWatch
        </span>
      )}
    </Link>
  )
}

/**
 * App chrome. Citizen routes render as a phone-width column (390px design
 * width) with a persistent bottom bar and a "Report" FAB, centred on desktop;
 * admin routes render as a desktop console. Same tokens everywhere, so it reads
 * as one product.
 */
export function PageShell({ children }: PageShellProps) {
  const { pathname } = useLocation()
  const isAdminRoute = pathname.startsWith('/admin')

  return isAdminRoute ? (
    <ConsoleShell>{children}</ConsoleShell>
  ) : (
    <AppShell>{children}</AppShell>
  )
}

/** Citizen experience: mobile-first frame, bottom navigation, Report FAB. */
function AppShell({ children }: PageShellProps) {
  const { user, status, signOut } = useAuth()
  const authed = status === 'authed' && user !== null

  return (
    <div className="min-h-dvh bg-surface-canvas">
      {/* Phone-width column (390px design width), centred on desktop. No
          overflow-hidden here: it would trap the sticky header and bottom bar. */}
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background sm:my-6 sm:min-h-[calc(100dvh-3rem)] sm:rounded-3xl sm:shadow-overlay sm:ring-1 sm:ring-white/5">
        <header className="sticky top-0 z-20 rounded-none border-b border-border bg-background/80 backdrop-blur-md sm:rounded-t-3xl">
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <BrandMark to={authed ? '/reports' : '/login'} />
            {user && (
              <div className="flex items-center gap-1">
                <Avatar className="size-9">
                  {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
                  <AvatarFallback className="text-label-md">{initials(user.name)}</AvatarFallback>
                </Avatar>
                <Button variant="ghost" size="icon-sm" onClick={() => void signOut()} aria-label="Sign out">
                  <LogOutIcon />
                </Button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 px-5 pt-5 pb-28">
          {/* As a router layout route, content arrives via <Outlet/>; the
              children prop only exists so legacy self-wrapping callers keep
              working. Route components are lazy-loaded — keep the chrome
              visible while a chunk loads. */}
          <Suspense fallback={<FullPageLoader />}>{children ?? <Outlet />}</Suspense>
        </main>

        {authed && <BottomNav />}
      </div>
    </div>
  )
}

/** Admin console: desktop layout, same tokens. */
function ConsoleShell({ children }: PageShellProps) {
  const { user, status, signOut } = useAuth()
  const navigate = useNavigate()
  const authed = status === 'authed' && user !== null

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-surface-glass backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <BrandMark to="/admin" />
          {authed && (
            <div className="flex items-center gap-3">
              <nav aria-label="Main navigation" className="flex items-center gap-1">
                <NavLinkItem to="/admin" label="Admin dashboard" />
              </nav>
              <div className="flex items-center gap-2 border-l border-border pl-3">
                <Avatar className="size-9">
                  {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
                  <AvatarFallback className="text-label-md">{initials(user?.name ?? '')}</AvatarFallback>
                </Avatar>
                <span className="hidden text-body-md text-muted-foreground sm:inline">{user?.name}</span>
                <Button variant="outline" size="sm" onClick={() => void handleSignOut()}>
                  Sign out
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-6">
        <Suspense fallback={<FullPageLoader />}>{children ?? <Outlet />}</Suspense>
      </main>

      <footer className="border-t border-border py-4">
        <p className="mx-auto w-full max-w-5xl px-6 text-label-md text-muted-foreground">
          PotholeWatch · citizen pothole reporting for municipal crews
        </p>
      </footer>
    </div>
  )
}
