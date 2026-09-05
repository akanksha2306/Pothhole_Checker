import { Badge } from '@/components/ui/badge'
import { repairStatusMeta } from '@/lib/repair-status'
import { cn } from '@/lib/utils'
import type { RepairStatus } from 'shared'

interface RepairStatusBadgeProps {
  status: RepairStatus
  className?: string
}

/** Civic Flow pill for the repair lifecycle. */
export function RepairStatusBadge({ status, className }: RepairStatusBadgeProps) {
  const meta = repairStatusMeta(status)
  return (
    <Badge variant="outline" className={cn('border-transparent', meta.badgeClassName, className)}>
      <span className={cn('size-1.5 rounded-full', meta.dotClassName)} aria-hidden="true" />
      {meta.label}
    </Badge>
  )
}
