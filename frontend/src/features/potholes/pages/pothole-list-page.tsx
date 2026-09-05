import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { PotholeListItem } from 'shared'

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

/** Details tab: every pothole in the ward, most-reported first. */
export function PotholeListPage() {
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
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="font-heading text-headline-md tracking-tight">Details</h1>
        <p className="text-body-md text-muted-foreground">
          {potholes.length} pothole{potholes.length === 1 ? '' : 's'} tracked in the ward
        </p>
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
        <FullPageLoader label="Loading potholes…" />
      ) : potholesQuery.isError ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p role="alert" className="text-body-md text-destructive">
              {errorMessage(potholesQuery.error, 'Could not load potholes.')}
            </p>
            <Button variant="outline" size="sm" onClick={() => void potholesQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <EmptyState
          title="Nothing in this bucket"
          description={
            filter === 'ALL'
              ? 'No potholes have been reported yet. They show up here the moment someone files one.'
              : 'No potholes are in this state right now. Try another filter.'
          }
        />
      ) : (
        <div className="grid gap-3">
          {visible.map((pothole) => (
            <PotholeListItemCard key={pothole.id} pothole={pothole} href={`/potholes/${pothole.humanCode}`} />
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

function PotholeListItemCard({ pothole, href }: { pothole: PotholeListItem; href: string }) {
  return (
    <Link
      to={href}
      className="flex items-stretch gap-3 rounded-lg border border-border bg-card p-3 shadow-card transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:bg-white/5"
    >
      <img
        src={`/api/potholes/${encodeURIComponent(pothole.humanCode)}/photo`}
        alt={`Latest photo of pothole ${pothole.humanCode}`}
        loading="lazy"
        className="size-20 shrink-0 rounded-md bg-surface-sunken object-cover"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-heading truncate text-body-lg font-semibold">
            {pothole.streetName ?? 'Unnamed road'}
          </p>
          <StatusBadge status={pothole.status} />
        </div>
        <p className="text-label-md text-muted-foreground">
          <span className="font-mono">#{pothole.humanCode}</span> · reported{' '}
          {formatRelativeDay(pothole.lastReportedAt)}
        </p>
        <p className="text-label-md text-muted-foreground">
          {pothole.reportCount} {pothole.reportCount === 1 ? 'report' : 'reports'} ·{' '}
          {pothole.repairsCount} {pothole.repairsCount === 1 ? 'repair' : 'repairs'}
        </p>
      </div>
    </Link>
  )
}
