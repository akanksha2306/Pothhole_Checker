import type { RepairStatus } from 'shared'

export interface RepairStatusMeta {
  label: string
  description: string
  badgeClassName: string
  dotClassName: string
}

/** Pill metadata for the repair lifecycle (mirrors the pothole pill language). */
export const REPAIR_STATUS_META: Record<RepairStatus, RepairStatusMeta> = {
  ASSIGNED: {
    label: 'Assigned',
    description: 'A crew has the job and has not started yet.',
    badgeClassName: 'bg-slate-500/10 text-slate-300',
    dotClassName: 'bg-slate-400',
  },
  IN_PROGRESS: {
    label: 'In progress',
    description: 'The crew is on site gathering before/after evidence.',
    badgeClassName: 'bg-amber-500/10 text-amber-400',
    dotClassName: 'bg-amber-500',
  },
  AWAITING_VERIFICATION: {
    label: 'Awaiting verification',
    description: 'Crew says it is done — citizens now confirm.',
    badgeClassName: 'bg-violet-500/10 text-violet-300',
    dotClassName: 'bg-violet-400',
  },
  VERIFIED_FIXED: {
    label: 'Verified fixed',
    description: 'Citizens confirmed the repair on site.',
    badgeClassName: 'bg-emerald-500/10 text-emerald-400',
    dotClassName: 'bg-emerald-500',
  },
  REOPENED: {
    label: 'Reopened',
    description: 'Citizens say it is not fixed — back to the crew.',
    badgeClassName: 'bg-rose-500/10 text-rose-400',
    dotClassName: 'bg-rose-500',
  },
}

export function repairStatusMeta(status: RepairStatus): RepairStatusMeta {
  return REPAIR_STATUS_META[status]
}
