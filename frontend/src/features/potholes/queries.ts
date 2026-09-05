import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PotholeStatusUpdateInput } from 'shared'

import { potholesApi, type PotholeFilterKey, type PotholeSort } from '@/lib/potholes-api'

export const potholeKeys = {
  all: ['potholes'] as const,
  list: (filter: PotholeFilterKey, sort: PotholeSort) => ['potholes', 'list', filter, sort] as const,
  detail: (idOrHumanCode: string) => ['potholes', 'detail', idOrHumanCode] as const,
  nearby: (latitude: number, longitude: number) => ['potholes', 'nearby', latitude, longitude] as const,
  nearbyArea: (latitude: number, longitude: number) =>
    ['potholes', 'nearby-area', latitude, longitude] as const,
}

export const reportKeys = {
  all: ['reports'] as const,
  mine: ['reports', 'mine'] as const,
}

interface PotholeListParams {
  filter: PotholeFilterKey
  sort: PotholeSort
  limit?: number
  enabled: boolean
}

function toStatusParam(filter: PotholeFilterKey): string | undefined {
  return filter === 'ALL' ? undefined : filter
}

/**
 * Map + Details feed. One fetch per filter (the map needs every status anyway,
 * so switching filters re-reads a small cached page rather than client-hiding
 * rows the user may still want counted).
 */
export function usePotholes({ filter, sort, limit = 100, enabled }: PotholeListParams) {
  return useInfiniteQuery({
    queryKey: [...potholeKeys.list(filter, sort), limit],
    queryFn: ({ pageParam }) =>
      potholesApi.list({ status: toStatusParam(filter), sort, cursor: pageParam, limit }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
  })
}

export function usePothole(idOrHumanCode: string, enabled: boolean) {
  return useQuery({
    queryKey: potholeKeys.detail(idOrHumanCode),
    queryFn: () => potholesApi.get(idOrHumanCode),
    enabled,
  })
}

/** Used by the SAME/NEW flow once a GPS fix exists. */
export function useNearbyPothole(location: { latitude: number; longitude: number } | null) {
  return useQuery({
    queryKey: potholeKeys.nearby(location?.latitude ?? 0, location?.longitude ?? 0),
    queryFn: () => potholesApi.nearby(location!.latitude, location!.longitude),
    enabled: location !== null,
    staleTime: 10_000,
  })
}

/** Area sweep for the report flow's "already reported here?" panel. */
export function useNearbyArea(location: { latitude: number; longitude: number } | null) {
  return useQuery({
    queryKey: potholeKeys.nearbyArea(location?.latitude ?? 0, location?.longitude ?? 0),
    queryFn: () => potholesApi.nearbyArea(location!.latitude, location!.longitude),
    enabled: location !== null,
    staleTime: 15_000,
  })
}

export function useMyReports(limit = 50) {
  return useInfiniteQuery({
    queryKey: [...reportKeys.mine, limit],
    queryFn: ({ pageParam }) => potholesApi.listMyReports({ cursor: pageParam, limit }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })
}

export function useCreateReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: potholesApi.createReport.bind(potholesApi),
    onSuccess: () => {
      // The new report moves counts/status on the pothole, so the map, list and
      // detail caches all refresh.
      void queryClient.invalidateQueries({ queryKey: potholeKeys.all })
      void queryClient.invalidateQueries({ queryKey: reportKeys.all })
    },
  })
}

/** Upvote toggle; pothole counts/status feeds refresh from the server truth. */
export function useToggleUpvote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (idOrHumanCode: string) => potholesApi.toggleUpvote(idOrHumanCode),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: potholeKeys.all })
    },
  })
}

/**
 * Admin status change with optimistic write-through to the detail cache and
 * rollback if the server rejects it.
 */
export function useUpdatePotholeStatus(idOrHumanCode: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: PotholeStatusUpdateInput) => potholesApi.updateStatus(idOrHumanCode, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: potholeKeys.detail(idOrHumanCode) })
      const previous = queryClient.getQueryData(potholeKeys.detail(idOrHumanCode))
      queryClient.setQueryData(potholeKeys.detail(idOrHumanCode), (current: unknown) => {
        if (!current || typeof current !== 'object' || !('pothole' in current)) return current
        const detail = current as { pothole: { status: string }; events: unknown[]; reports: unknown[] }
        return {
          ...detail,
          pothole: { ...detail.pothole, status: input.status },
          events: [
            {
              id: 'optimistic',
              type: 'STATUS_CHANGED',
              at: new Date().toISOString(),
              note: input.note ?? null,
              byUser: null,
            },
            ...detail.events,
          ],
        }
      })
      return { previous }
    },
    onError: (_error, _input, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(potholeKeys.detail(idOrHumanCode), context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: potholeKeys.detail(idOrHumanCode) })
      void queryClient.invalidateQueries({ queryKey: potholeKeys.all })
    },
  })
}
