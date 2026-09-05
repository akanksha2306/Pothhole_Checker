import { Link } from 'react-router'
import type { ReportWithPothole } from 'shared'

import { StatusBadge } from '@/components/molecules/status-badge'
import { formatRelativeDay } from '@/lib/format'
import { cn } from '@/lib/utils'

interface ReportListItemProps {
  report: ReportWithPothole
  /** Citizen links to the pothole page; admin links to the console variant. */
  href: string
  className?: string
}

/**
 * A report row as it appears in "My Reports": the report's description and
 * date, plus the pothole it is attached to (code, status, report count).
 */
export function ReportListItem({ report, href, className }: ReportListItemProps) {
  const title =
    report.description && report.description.length > 0
      ? report.description
      : (report.pothole.streetName ?? 'Unnamed road')

  return (
    <Link
      to={href}
      className={cn(
        'flex items-stretch gap-3 rounded-lg border border-border bg-card p-3 shadow-card transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:bg-white/5',
        className,
      )}
    >
      <img
        src={`/api/reports/${report.id}/photo`}
        alt={`Photo from your report on ${formatRelativeDay(report.createdAt)}`}
        loading="lazy"
        className="size-20 shrink-0 rounded-md bg-surface-sunken object-cover"
      />

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-body-md font-semibold text-foreground">{title}</p>
          <StatusBadge status={report.pothole.status} />
        </div>
        <p className="text-label-md text-muted-foreground">
          <span className="font-mono">#{report.pothole.humanCode}</span> ·{' '}
          {formatRelativeDay(report.createdAt)}
        </p>
        <p className="text-label-md text-muted-foreground">
          {report.pothole.reportCount}{' '}
          {report.pothole.reportCount === 1 ? 'report' : 'reports'} on this pothole
        </p>
      </div>
    </Link>
  )
}
