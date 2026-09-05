import { ClipboardList, Map as MapIcon, Plus, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router'

import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

const LEFT_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Map', icon: MapIcon },
  { to: '/potholes', label: 'Details', icon: ClipboardList },
]

const RIGHT_ITEMS: readonly NavItem[] = [{ to: '/community', label: 'Community', icon: Users }]

/** The FAB is active while the report flow is on screen (but not on /reports). */
function isReportActive(pathname: string): boolean {
  return pathname === '/report' || pathname.startsWith('/report/new')
}

function isActive(pathname: string, to: string): boolean {
  return to === '/' ? pathname === '/' : pathname.startsWith(to)
}

/**
 * Civic Flow bottom bar: two tabs either side of a deliberately raised centre
 * FAB. The FAB breaks the bar's top edge by about half its height with a
 * page-coloured separation ring and an emerald glow, so it reads as the primary
 * action rather than a clipped circle. No `overflow-hidden` here — that is what
 * clipped it before. Tabs share one grid: 24px icon over a label-md caption,
 * every label on the same 10px-from-bottom baseline.
 */
export function BottomNav() {
  const { pathname } = useLocation()
  const reportActive = isReportActive(pathname)

  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-30 rounded-none border-t border-border bg-card/95 shadow-overlay backdrop-blur-md sm:rounded-b-3xl"
    >
      {/* Equal 1fr pairs either side of a fixed centre column keep the FAB at
          the exact midpoint and every tab on the same rhythm. */}
      <div className="mx-auto grid h-16 max-w-[430px] grid-cols-[1fr_1fr_5rem_1fr_1fr] items-stretch px-2">
        {LEFT_ITEMS.map((item) => (
          <BottomNavItem key={item.to} item={item} active={isActive(pathname, item.to)} />
        ))}

        <div className="relative">
          <Link
            to="/report/new"
            aria-label="Report a pothole"
            aria-current={reportActive ? 'page' : undefined}
            className={cn(
              // 56px circle, half above the bar's top edge.
              'absolute -top-7 left-1/2 z-40 flex size-14 -translate-x-1/2 items-center justify-center rounded-full ring-4 transition-all',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-95',
              reportActive
                ? 'bg-primary text-primary-foreground ring-primary/30 shadow-glow ring-offset-2 ring-offset-background'
                : 'bg-primary text-primary-foreground ring-background shadow-glow',
            )}
          >
            <Plus className="size-7" aria-hidden="true" />
          </Link>
          <span
            className={cn(
              'pointer-events-none absolute inset-x-0 bottom-2.5 text-center text-label-md',
              reportActive ? 'font-semibold text-primary' : 'text-muted-foreground',
            )}
          >
            Report
          </span>
        </div>

        {RIGHT_ITEMS.map((item) => (
          <BottomNavItem key={item.to} item={item} active={isActive(pathname, item.to)} />
        ))}
      </div>
      {/* Home-indicator safe area on iOS. */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  )
}

function BottomNavItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-16 flex-col items-center justify-center gap-1 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        active ? 'text-primary' : 'text-muted-foreground/70 hover:text-muted-foreground',
      )}
    >
      <Icon className="size-6" aria-hidden="true" />
      <span className={cn('text-label-md', active && 'font-semibold')}>{item.label}</span>
    </NavLink>
  )
}
