import {
  Camera,
  CheckCircle2,
  ClipboardList,
  Flag,
  MapPin,
  RefreshCw,
  RotateCcw,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { PotholeEvent, PotholeEventType, ReportStatus } from 'shared'

import { formatDate } from '@/lib/format'
import { REPORT_STATUSES, reportStatusMeta } from '@/lib/report-status'
import { cn } from '@/lib/utils'

const EVENT_ICON: Record<PotholeEventType, LucideIcon> = {
  REPORTED: MapPin,
  REPAIRED: CheckCircle2,
  REPORTED_AGAIN: RefreshCw,
  STATUS_CHANGED: Flag,
  REPAIR_ASSIGNED: ClipboardList,
  REPAIR_SUBMITTED: Camera,
  REPAIR_VERIFIED: CheckCircle2,
  REOPENED: RotateCcw,
}

const EVENT_TONE: Record<PotholeEventType, string> = {
  REPORTED: 'bg-rose-500/15 text-rose-400',
  REPAIRED: 'bg-emerald-500/15 text-emerald-400',
  REPORTED_AGAIN: 'bg-amber-500/15 text-amber-400',
  STATUS_CHANGED: 'bg-white/5 text-muted-foreground',
  REPAIR_ASSIGNED: 'bg-white/5 text-muted-foreground',
  REPAIR_SUBMITTED: 'bg-violet-500/15 text-violet-300',
  REPAIR_VERIFIED: 'bg-emerald-500/15 text-emerald-400',
  REOPENED: 'bg-rose-500/15 text-rose-400',
}

/** Recovers the target status from a STATUS_CHANGED note ("Moved to RESOLVED"). */
function statusFromNote(note: string | null): ReportStatus | null {
  if (!note) return null
  const upper = note.toUpperCase()
  return REPORT_STATUSES.find((status) => upper.includes(status)) ?? null
}

interface PotholeTimelineProps {
  /** Newest first, exactly as the API returns them. */
  events: readonly PotholeEvent[]
  className?: string
}

/**
 * History timeline, per the Stitch detail screen: icon column, date + label,
 * optional note. The oldest REPORTED event is labelled as the first report.
 */
export function PotholeTimeline({ events, className }: PotholeTimelineProps) {
  if (events.length === 0) {
    return (
      <p className={cn('text-body-md text-muted-foreground', className)}>No history recorded yet.</p>
    )
  }

  const oldestReportedIndex = findLastIndex(events, (event) => event.type === 'REPORTED')

  return (
    <ol className={cn('space-y-4', className)}>
      {events.map((event, index) => {
        const Icon = EVENT_ICON[event.type]
        const isFirstReport = index === oldestReportedIndex
        const changedTo = event.type === 'STATUS_CHANGED' ? statusFromNote(event.note) : null

        return (
          <li key={event.id} className="relative flex gap-3 pb-1">
            {index < events.length - 1 && (
              <span
                className="absolute top-10 bottom-0 left-[15px] w-px bg-border"
                aria-hidden="true"
              />
            )}
            <span
              className={cn(
                'z-10 flex size-8 shrink-0 items-center justify-center rounded-full',
                EVENT_TONE[event.type],
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
            </span>

            <div className="min-w-0 space-y-0.5 pt-0.5">
              <p className="text-label-md text-muted-foreground">{formatDate(event.at)}</p>
              <p className="text-body-md font-semibold text-foreground">
                {event.type === 'REPORTED' && isFirstReport && 'First reported'}
                {event.type === 'REPORTED' && !isFirstReport && 'Reported again'}
                {event.type === 'REPORTED_AGAIN' && 'Reported again'}
                {event.type === 'REPAIRED' && 'Repaired'}
                {event.type === 'REPAIR_ASSIGNED' && 'Repair assigned'}
                {event.type === 'REPAIR_SUBMITTED' &&
                  'Repair submitted — awaiting citizen verification'}
                {event.type === 'REPAIR_VERIFIED' && 'Repair verified'}
                {event.type === 'REOPENED' && 'Reopened — citizen says not fixed'}
                {event.type === 'STATUS_CHANGED' && (
                  <>
                    Status changed
                    {changedTo && ` → ${reportStatusMeta(changedTo).label}`}
                  </>
                )}
                {event.byUser && <span className="font-normal text-muted-foreground"> — {event.byUser.name}</span>}
              </p>
              {event.note && !changedTo && (
                <p className="text-body-md text-muted-foreground">{event.note}</p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function findLastIndex<T>(items: readonly T[], predicate: (item: T) => boolean): number {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i]
    if (item !== undefined && predicate(item)) return i
  }
  return -1
}
