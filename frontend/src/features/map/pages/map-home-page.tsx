import { useMemo, useState } from 'react'

import { FullPageLoader } from '@/components/molecules/full-page-loader'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-provider'
import { MAP_FILTERS, MapFilterPills, countByFilter } from '@/features/map/components/map-filter-pills'
import { PotholeCallout } from '@/features/map/components/pothole-callout'
import { PotholeMap } from '@/features/map/components/pothole-map'
import { useUserLocation } from '@/features/map/use-user-location'
import { usePothole, usePotholes } from '@/features/potholes/queries'
import { DEFAULT_MAP_CENTER } from '@/lib/geo'
import type { PotholeFilterKey } from '@/lib/potholes-api'

/**
 * Map home — the app's front door. One unfiltered feed drives markers, filter
 * counts and the Details tab, so switching pills never refetches.
 */
export function MapHomePage() {
  const { status } = useAuth()
  const potholesQuery = usePotholes({ filter: 'ALL', sort: 'recent', enabled: status === 'authed' })
  const { location: me, denied } = useUserLocation()
  const [filter, setFilter] = useState<PotholeFilterKey>('ALL')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const potholes = useMemo(
    () => potholesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [potholesQuery.data],
  )
  const counts = useMemo(() => countByFilter(potholes), [potholes])

  const visible = useMemo(() => {
    const filterDef = MAP_FILTERS.find((candidate) => candidate.key === filter)
    return filterDef ? potholes.filter((item) => filterDef.matches.includes(item.status)) : potholes
  }, [potholes, filter])

  const selected = visible.find((item) => item.id === selectedId) ?? null
  // Latest report description for the callout snippet.
  const selectedDetail = usePothole(selected?.humanCode ?? '', Boolean(selected))

  return (
    <div className="relative -mx-5 -mt-5 -mb-28 h-[calc(100dvh-7.75rem)] sm:h-[calc(100dvh-10.75rem)] overflow-hidden">
      <PotholeMap
        potholes={visible}
        selectedId={selectedId}
        onSelect={setSelectedId}
        me={me}
        fallbackCenter={potholes[0] ?? DEFAULT_MAP_CENTER}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] p-4">
        <div className="pointer-events-auto">
          <MapFilterPills counts={counts} active={filter} onChange={setFilter} />
        </div>
        {denied && potholesQuery.isSuccess && (
          <p className="mx-auto mt-2 w-fit rounded-full border border-border bg-surface-glass px-4 py-2 text-label-md text-muted-foreground backdrop-blur-md">
            Location off — showing every reported pothole
          </p>
        )}
      </div>

      {potholesQuery.isPending && (
        <div className="absolute inset-0 z-[600] flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <FullPageLoader label="Loading the map…" />
        </div>
      )}

      {potholesQuery.isError && (
        <div className="absolute inset-x-0 bottom-0 z-[600] p-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-overlay">
            <p role="alert" className="text-body-md text-destructive">
              Could not load the map data.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void potholesQuery.refetch()}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {selected && (
        <div className="absolute inset-x-0 bottom-0 z-[600] px-4 pb-8">
          <PotholeCallout
            pothole={selected}
            description={selectedDetail.data?.reports[0]?.description ?? null}
            loadingDescription={selectedDetail.isPending}
            me={me}
          />
        </div>
      )}
    </div>
  )
}
