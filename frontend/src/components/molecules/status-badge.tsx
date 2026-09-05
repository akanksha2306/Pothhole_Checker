import { Badge } from '@/components/ui/badge'
import { reportStatusMeta } from '@/lib/report-status'
import { cn } from '@/lib/utils'
import type { ReportStatus } from 'shared'

interface StatusBadgeProps {
  status: ReportStatus
  className?: string
}

/** Civic Flow status pill: fully rounded, 10% tint + solid text of that family. */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const meta = reportStatusMeta(status)
  return (
    <Badge variant="outline" className={cn('border-transparent', meta.badgeClassName, className)}>
      <span className={cn('size-1.5 rounded-full', meta.dotClassName)} aria-hidden="true" />
      {meta.label}
    </Badge>
  )
}
