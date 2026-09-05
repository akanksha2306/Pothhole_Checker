import { Link } from 'react-router'
import { ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'

import { EmptyState } from '@/components/molecules/empty-state'
import { FullPageLoader } from '@/components/molecules/full-page-loader'
import { LoadMoreButton } from '@/components/molecules/load-more-button'
import { StatusBadge } from '@/components/molecules/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MAP_FILTERS } from '@/features/map/components/map-filter-pills'
import { usePotholes } from '@/features/potholes/queries'
import { errorMessage } from '@/lib/error-message'
import { formatRelativeDay } from '@/lib/format'
import type { PotholeFilterKey } from '@/lib/potholes-api'

/** Admin triage: every pothole, most-reported first. */
export function AdminDashboardPage() {
  const [filter, setFilter] = useState<PotholeFilterKey>('ALL')
  const potholesQuery = usePotholes({ filter: 'ALL', sort: 'reports', enabled: true })
  const potholes = useMemo(
    () => potholesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [potholesQuery.data],
  )

  const visible = useMemo(() => {
    const filterDef = MAP_FILTERS.find((candidate) => candidate.key === filter)
    return filterDef ? potholes.filter((item) => filterDef.matches.includes(item.status)) : potholes
  }, [potholes, filter])

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </span>
        <div className="space-y-0.5">
          <h1 className="font-heading text-headline-md tracking-tight">Pothole queue</h1>
          <p className="text-body-md text-muted-foreground">
            {potholes.length} in the ward · most-reported first
          </p>
        </div>
      </header>

      <div role="tablist" aria-label="Filter potholes by status" className="flex flex-wrap gap-2">
        {MAP_FILTERS.map((option) => {
          const isActive = filter === option.key
          return (
            <Button
              key={option.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              size="sm"
              variant={isActive ? 'default' : 'outline'}
              onClick={() => setFilter(option.key)}
            >
              {option.label}
            </Button>
          )
        })}
      </div>

      {potholesQuery.isPending ? (
        <FullPageLoader label="Loading the queue…" />
      ) : potholesQuery.isError ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p role="alert" className="text-body-md text-destructive">
              {errorMessage(potholesQuery.error, 'Could not load the pothole queue.')}
            </p>
            <Button variant="outline" size="sm" onClick={() => void potholesQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nothing in this bucket"
          description={
            filter === 'ALL'
              ? 'No potholes have been reported yet. They appear here the moment a citizen submits one.'
              : 'No potholes are in this state right now. Pick another filter to keep triaging.'
          }
        />
      ) : (
        <div className="grid gap-2">
          {visible.map((pothole) => (
            <Link
              key={pothole.id}
              to={`/admin/potholes/${pothole.humanCode}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-card transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <div className="min-w-0 space-y-1">
                <p className="truncate text-body-md font-semibold">
                  {pothole.streetName ?? 'Unnamed road'}
                </p>
                <p className="text-label-md text-muted-foreground">
                  <span className="font-mono">#{pothole.humanCode}</span> ·{' '}
                  {pothole.reportCount} {pothole.reportCount === 1 ? 'report' : 'reports'} · last
                  reported {formatRelativeDay(pothole.lastReportedAt)}
                </p>
              </div>
              <StatusBadge status={pothole.status} />
            </Link>
          ))}
        </div>
      )}

      {potholesQuery.hasNextPage && (
        <LoadMoreButton
          onClick={() => void potholesQuery.fetchNextPage()}
          loading={potholesQuery.isFetchingNextPage}
        />
      )}
    </div>
  )
}
