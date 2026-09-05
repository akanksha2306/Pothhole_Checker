import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import type { PotholeListItem } from 'shared'

import { StatusBadge } from '@/components/molecules/status-badge'
import { Button } from '@/components/ui/button'
import { formatDistance, haversineMeters, type LatLng } from '@/lib/geo'
import { cn } from '@/lib/utils'

interface PotholeCalloutProps {
  pothole: PotholeListItem
  /** Snippet from the pothole's newest report (fetched with the detail query). */
  description: string | null
  loadingDescription: boolean
  /** Signed-in user's position, for the "120m away" line. */
  me: LatLng | null
  className?: string
}

/** Bottom-sheet callout over the map for the tapped marker. */
export function PotholeCallout({
  pothole,
  description,
  loadingDescription,
  me,
  className,
}: PotholeCalloutProps) {
  const distance = me ? haversineMeters(me, pothole) : null

  return (
    <div
      className={cn(
        'rounded-2xl border border-white/5 bg-surface-glass p-4 shadow-overlay backdrop-blur-md',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-heading text-headline-sm text-foreground">
            {pothole.streetName ?? 'Unnamed road'}
          </p>
          <p className="text-label-md text-muted-foreground">
            <span className="font-mono">#{pothole.humanCode}</span>
            {distance !== null && ` · ${formatDistance(distance)}`}
          </p>
        </div>
        <StatusBadge status={pothole.status} />
      </div>

      <p className="mt-2 line-clamp-2 text-body-md text-muted-foreground">
        {loadingDescription ? 'Loading details…' : (description ?? 'No description in the latest report.')}
      </p>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-label-md text-muted-foreground">
          Validated by{' '}
          <span className="font-semibold text-foreground">{pothole.reportCount}</span>{' '}
          {pothole.reportCount === 1 ? 'resident' : 'residents'}
        </p>
        <Button asChild size="sm">
          <Link to={`/potholes/${pothole.humanCode}`}>
            View Details
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  )
}

export function PotholeCalloutSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'space-y-3 rounded-2xl border border-white/5 bg-surface-glass p-4 shadow-overlay backdrop-blur-md',
        className,
      )}
    >
      <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
      <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
      <div className="h-4 w-full animate-pulse rounded bg-muted" />
      <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
    </div>
  )
}
