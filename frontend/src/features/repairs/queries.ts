import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { RepairVerdict } from 'shared'

import { potholeKeys } from '@/features/potholes/queries'
import { potholesApi } from '@/lib/potholes-api'

/**
 * Repair mutations. Every one changes the pothole's evidence chain, status or
 * counts, so they all refresh the pothole caches (detail + map/list feeds).
 */
function useRepairMutation<IV, RV>(mutationFn: (input: IV) => Promise<RV>, idOrHumanCode: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: potholeKeys.detail(idOrHumanCode) })
      void queryClient.invalidateQueries({ queryKey: potholeKeys.all })
    },
  })
}

/** Admin: put a crew on the pothole. */
export function useAssignRepair(idOrHumanCode: string) {
  return useRepairMutation(
    (input: { note?: string }) => potholesApi.assignRepair(idOrHumanCode, input.note),
    idOrHumanCode,
  )
}

/** Repairer: claim an ASSIGNED job. */
export function usePickupRepair(idOrHumanCode: string, repairId: string) {
  return useRepairMutation(() => potholesApi.pickupRepair(repairId), idOrHumanCode)
}

/** Repairer: attach GPS-bound before/after evidence. */
export function useAddRepairEvidence(
  idOrHumanCode: string,
  repairId: string,
  kind: 'before' | 'after',
) {
  return useRepairMutation(
    (input: { photoKey: string; latitude: number; longitude: number }) =>
      potholesApi.addRepairEvidence(repairId, kind, input),
    idOrHumanCode,
  )
}

/** Citizen (or admin) verdict. 409 once verification closes. */
export function useVerifyRepair(idOrHumanCode: string, repairId: string) {
  return useRepairMutation(
    (input: { verdict: RepairVerdict; note?: string }) =>
      potholesApi.verifyRepair(repairId, input.verdict, input.note),
    idOrHumanCode,
  )
}
