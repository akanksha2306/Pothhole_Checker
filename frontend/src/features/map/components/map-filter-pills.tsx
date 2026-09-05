import { useEffect, useRef } from 'react'
import type { PotholeFilterKey } from '@/lib/potholes-api'
import { cn } from '@/lib/utils'

export interface MapFilter {
  key: PotholeFilterKey
  label: string
  /** Statuses this pill matches on the client. */
  matches: readonly ('REPORTED' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'AWAITING_VERIFICATION' | 'RESOLVED')[]
}

export const MAP_FILTERS: readonly MapFilter[] = [
  { key: 'ALL', label: 'All', matches: ['REPORTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED'] },
  { key: 'REPORTED', label: 'Needs attention', matches: ['REPORTED'] },
  { key: 'IN_PROGRESS', label: 'In progress', matches: ['IN_PROGRESS', 'ACKNOWLEDGED', 'AWAITING_VERIFICATION'] },
  { key: 'RESOLVED', label: 'Fixed', matches: ['RESOLVED'] },
]

interface MapFilterPillsProps {
  counts: Record<PotholeFilterKey, number>
  active: PotholeFilterKey
  onChange: (key: PotholeFilterKey) => void
  className?: string
}

/**
 * Filter pills over the map. The row scrolls horizontally with a right-edge
 * scrim so clipped pills are hinted, and the active pill is scrolled into view
 * whenever the filter changes.
 */
export function MapFilterPills({ counts, active, onChange, className }: MapFilterPillsProps) {
  const activeRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  }, [active])

  return (
    <div className={cn('relative', className)}>
      <div
        role="tablist"
        aria-label="Filter potholes by status"
        className="scrollbar-hide flex gap-2 overflow-x-auto pr-8"
      >
        {MAP_FILTERS.map((filter) => {
          const isActive = active === filter.key
          return (
            <button
              key={filter.key}
              ref={isActive ? activeRef : undefined}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(filter.key)}
              className={cn(
                'flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-label-lg transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:brightness-110',
                isActive
                  ? 'border-transparent bg-primary text-primary-foreground shadow-glow'
                  : 'border-border bg-surface-glass text-foreground backdrop-blur-md hover:bg-accent',
              )}
            >
              {filter.label}
              <span
                className={cn(
                  'rounded-full px-1.5 text-label-md tabular-nums',
                  isActive ? 'bg-primary-foreground/20' : 'bg-white/5 text-muted-foreground',
                )}
              >
                {counts[filter.key] ?? 0}
              </span>
            </button>
          )
        })}
      </div>

      {/* Right-edge scrim: hints that more pills are off-screen. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background/95 via-background/50 to-transparent"
      />
    </div>
  )
}

/** Live pill counts, derived from the loaded pothole feed. */
export function countByFilter(
  items: readonly { status: MapFilter['matches'][number] }[],
): Record<PotholeFilterKey, number> {
  return MAP_FILTERS.reduce<Record<PotholeFilterKey, number>>(
    (acc, filter) => {
      acc[filter.key] = items.filter((item) => filter.matches.includes(item.status)).length
      return acc
    },
    {
      ALL: items.length,
      REPORTED: 0,
      ACKNOWLEDGED: 0,
      IN_PROGRESS: 0,
      AWAITING_VERIFICATION: 0,
      RESOLVED: 0,
    },
  )
}
