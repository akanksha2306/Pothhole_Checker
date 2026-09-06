import type { ReportStatus } from 'shared'

export interface ReportStatusMeta {
  /** Human label shown in badges, filters and detail screens. */
  label: string
  /** One-line explanation for the status timeline. */
  description: string
  /** Pill tint: 10% opacity background + solid text of the same family. */
  badgeClassName: string
  /** Leading dot inside the pill. */
  dotClassName: string
}

/**
 * Civic Flow status pills (dark emerald): REPORTED rose, ACKNOWLEDGED amber,
 * IN_PROGRESS amber, AWAITING_VERIFICATION violet (crew claims done, citizens
 * must confirm), RESOLVED emerald — 10% tint background + solid text.
 */
export const REPORT_STATUS_META: Record<ReportStatus, ReportStatusMeta> = {
  REPORTED: {
    label: 'Reported',
    description: 'Received from a citizen and waiting for municipal review.',
    badgeClassName: 'bg-rose-500/10 text-rose-400',
    dotClassName: 'bg-rose-500',
  },
  ACKNOWLEDGED: {
    label: 'Acknowledged',
    description: 'The city has the report and assigned it to a crew.',
    badgeClassName: 'bg-amber-500/10 text-amber-300',
    dotClassName: 'bg-amber-400',
  },
  IN_PROGRESS: {
    label: 'In progress',
    description: 'A crew is on site or the repair is underway.',
    badgeClassName: 'bg-amber-500/15 text-amber-400',
    dotClassName: 'bg-amber-500',
  },
  AWAITING_VERIFICATION: {
    label: 'Awaiting verification',
    description: 'The crew reports the repair done — citizens now confirm it on site.',
    badgeClassName: 'bg-violet-500/10 text-violet-300',
    dotClassName: 'bg-violet-400',
  },
  RESOLVED: {
    label: 'Resolved',
    description: 'Repair completed and verified.',
    badgeClassName: 'bg-emerald-500/10 text-emerald-400',
    dotClassName: 'bg-emerald-500',
  },
}

export function reportStatusMeta(status: ReportStatus): ReportStatusMeta {
  return REPORT_STATUS_META[status]
}

/** All statuses in triage order, newest lifecycle stage last. */
export const REPORT_STATUSES: readonly ReportStatus[] = [
  'REPORTED',
  'ACKNOWLEDGED',
  'IN_PROGRESS',
  'RESOLVED',
]

/**
 * Statuses an admin may set by hand. RESOLVED is deliberately absent: it is
 * earned by a verified repair — the status endpoint answers 409 for RESOLVED.
 */
export const MANUAL_POTHOLE_STATUSES: readonly ReportStatus[] = [
  'REPORTED',
  'ACKNOWLEDGED',
  'IN_PROGRESS',
]
