import { EvidenceSlot } from '@/features/repairs/components/evidence-slot'
import { RepairStatusBadge } from '@/components/molecules/repair-status-badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { formatRelativeDay } from '@/lib/format'
import { repairStatusMeta } from '@/lib/repair-status'
import { cn } from '@/lib/utils'
import type { Repair } from 'shared'

interface RepairCardProps {
  repair: Repair
  className?: string
}

/** One repair in a pothole's evidence chain: status, crew, evidence, verdicts. */
export function RepairCard({ repair, className }: RepairCardProps) {
  const meta = repairStatusMeta(repair.status)

  return (
    <Card className={cn('gap-0 py-0', className)}>
      <CardHeader className="space-y-2 border-b border-border/70 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <p className="text-label-md text-muted-foreground">
              {repair.repairer
                ? `Crew: ${repair.repairer.name}`
                : `Assigned by ${repair.assignedBy.name}`}
            </p>
            <p className="text-label-md text-muted-foreground">
              Updated {formatRelativeDay(repair.updatedAt)}
            </p>
          </div>
          <RepairStatusBadge status={repair.status} />
        </div>
        {repair.note && <p className="text-body-md text-muted-foreground">{repair.note}</p>}
        {repair.status === 'AWAITING_VERIFICATION' && (
          <p className="text-body-md text-violet-300">{meta.description}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-3 py-4">
        <div className="grid grid-cols-2 gap-3">
          <EvidenceSlot
            repairId={repair.id}
            stage="before"
            at={repair.before?.at}
            latitude={repair.before?.latitude}
            longitude={repair.before?.longitude}
          />
          <EvidenceSlot
            repairId={repair.id}
            stage="after"
            at={repair.after?.at}
            latitude={repair.after?.latitude}
            longitude={repair.after?.longitude}
          />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-sunken px-3 py-2">
          <p className="text-label-md text-muted-foreground">
            <span className="font-semibold text-foreground">{repair.verifications.total}</span>{' '}
            {repair.verifications.total === 1 ? 'verdict' : 'verdicts'} ·{' '}
            <span className="text-emerald-400">{repair.verifications.fixed} fixed</span> ·{' '}
            <span className="text-rose-400">{repair.verifications.notFixed} not fixed</span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
