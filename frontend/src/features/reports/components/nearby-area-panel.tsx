import { Link } from 'react-router'
import { ThumbsUp } from 'lucide-react'
import { useState } from 'react'
import type { PotholeAreaItem } from 'shared'

import { StatusBadge } from '@/components/molecules/status-badge'
import { FullPageLoader } from '@/components/molecules/full-page-loader'
import { Button } from '@/components/ui/button'
import { useNearbyArea, useToggleUpvote } from '@/features/potholes/queries'
import { errorMessage } from '@/lib/error-message'
import type { LatLng } from '@/lib/geo'
import { formatDistanceShort } from '@/lib/format'
import { cn } from '@/lib/utils'

interface NearbyAreaPanelProps {
  location: LatLng
  /** The 20m identity match, if the SAME/NEW card is showing — de-emphasised. */
  samePotholeCode?: string | null
  className?: string
}

interface UpvoteState {
  upvoted: boolean
  count: number
}

/**
 * "Already reported here?" sweep: everything within ~2km of the capture point,
 * each with an upvote toggle. Rendered under the SAME/NEW card — that one is
 * the decision-critical prompt, this is context.
 */
export function NearbyAreaPanel({ location, samePotholeCode, className }: NearbyAreaPanelProps) {
  const areaQuery = useNearbyArea(location)
  const toggleUpvote = useToggleUpvote()

  // Optimistic toggle state per pothole, seeded from the viewer-scoped
  // `myUpvote` the area endpoint returns; server truth lands with each response.
  const [upvotes, setUpvotes] = useState<Record<string, UpvoteState>>({})

  const items = areaQuery.data?.items ?? []
  const total = areaQuery.data?.total ?? 0

  function toggle(item: PotholeAreaItem) {
    const current = upvotes[item.humanCode] ?? { upvoted: item.myUpvote, count: item.upvoteCount }
    const optimistic: UpvoteState = current.upvoted
      ? { upvoted: false, count: Math.max(0, current.count - 1) }
      : { upvoted: true, count: current.count + 1 }

    setUpvotes((state) => ({ ...state, [item.humanCode]: optimistic }))

    toggleUpvote.mutate(item.humanCode, {
      onSuccess: (response) =>
        setUpvotes((state) => ({
          ...state,
          [item.humanCode]: { upvoted: response.upvoted, count: response.upvoteCount },
        })),
      onError: () => {
        // Roll back to the value we started from; the button re-enables.
        setUpvotes((state) => ({ ...state, [item.humanCode]: current }))
      },
    })
  }

  return (
    <section
      className={cn('space-y-3 rounded-lg border border-border bg-card p-4 shadow-card', className)}
      aria-label="Potholes in your area"
    >
      <div className="space-y-0.5">
        <p className="font-heading text-body-lg font-semibold text-foreground">
          {areaQuery.isSuccess ? (
            <>
              {total} pothole{total === 1 ? '' : 's'} within 2 km of you
            </>
          ) : (
            'Potholes within 2 km of you'
          )}
        </p>
        <p className="text-label-md text-muted-foreground">
          Someone may have already reported the pothole in your photo — add your upvote to push it
          up the queue.
        </p>
      </div>

      {areaQuery.isPending ? (
        <FullPageLoader label="Checking the area…" className="py-6" />
      ) : areaQuery.isError ? (
        <p role="alert" className="text-body-md text-destructive">
          {errorMessage(areaQuery.error, 'Could not load potholes near you.')}
        </p>
      ) : items.length === 0 ? (
        <p className="text-body-md text-muted-foreground">
          Nothing reported within 2 km yet — yours will be the first on the map.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-border/70">
            {items.map((item) => {
              const isSameOne = item.humanCode === samePotholeCode
              const upvote = upvotes[item.humanCode] ?? {
                upvoted: item.myUpvote,
                count: item.upvoteCount,
              }
              return (
                <li key={item.id} className={cn('py-2.5 first:pt-0 last:pb-0', isSameOne && 'opacity-60')}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/potholes/${item.humanCode}`}
                          className="truncate text-body-md font-semibold text-foreground underline-offset-2 hover:text-primary hover:underline"
                        >
                          {item.streetName ?? 'Unnamed road'}
                        </Link>
                        {isSameOne && (
                          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-label-md text-primary">
                            this one
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-label-md text-muted-foreground">
                        <span className="font-mono">#{item.humanCode}</span> ·{' '}
                        {formatDistanceShort(item.distanceMeters)} · {item.reportCount}{' '}
                        {item.reportCount === 1 ? 'report' : 'reports'} ·{' '}
                        <ThumbsUp
                          className="inline size-3 align-[-1px] text-muted-foreground"
                          aria-hidden="true"
                        />{' '}
                        {upvote.count}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={item.status} />
                      <Button
                        type="button"
                        variant={upvote.upvoted ? 'default' : 'outline'}
                        size="sm"
                        aria-pressed={upvote.upvoted}
                        aria-label={
                          upvote.upvoted
                            ? `Remove upvote from ${item.humanCode}`
                            : `Upvote ${item.humanCode}`
                        }
                        disabled={toggleUpvote.isPending}
                        onClick={() => toggle(item)}
                      >
                        <ThumbsUp className="size-4" aria-hidden="true" />
                        {upvote.count}
                      </Button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          {total > items.length && (
            <p className="text-label-md text-muted-foreground">
              Showing the {items.length} nearest · {total - items.length} more within 2 km
            </p>
          )}
        </>
      )}
    </section>
  )
}
