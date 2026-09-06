import { ChevronLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { FullPageLoader } from '@/components/molecules/full-page-loader'
import { StatusBadge } from '@/components/molecules/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { canActAsRepairer, useAuth } from '@/features/auth/auth-provider'
import { PotholeStatusUpdateCard } from '@/features/potholes/components/pothole-status-update-card'
import { ReportHistoryCard } from '@/features/potholes/components/report-history-card'
import { PotholeTimeline } from '@/features/potholes/components/pothole-timeline'
import { usePothole } from '@/features/potholes/queries'
import { AssignRepairCard } from '@/features/repairs/components/assign-repair-card'
import { RepairCard } from '@/features/repairs/components/repair-card'
import { RepairStepper } from '@/features/repairs/components/repair-stepper'
import { RepairVerificationCard } from '@/features/repairs/components/repair-verification-card'
import type { Repair } from 'shared'
import { isApiError } from '@/lib/api'
import { formatCoordinates, formatDate } from '@/lib/format'
import { reportStatusMeta } from '@/lib/report-status'

/** Pothole detail — the entity page, reachable by UUID or humanCode. */
export function PotholeDetailPage() {
  const { idOrHumanCode } = useParams()
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const detailQuery = usePothole(idOrHumanCode ?? '', Boolean(idOrHumanCode))

  if (detailQuery.isPending) {
    return <FullPageLoader label="Loading pothole…" />
  }

  if (detailQuery.isError) {
    const notFound = isApiError(detailQuery.error) && detailQuery.error.code === 'NOT_FOUND'
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="space-y-2 py-10 text-center">
          <h1 className="font-heading text-headline-sm">
            {notFound ? 'Pothole not found' : 'Could not load this pothole'}
          </h1>
          <p className="text-body-md text-muted-foreground">
            {notFound
              ? 'That code does not match a pothole in the system.'
              : 'It may be a temporary service problem — try again in a moment.'}
          </p>
          <div className="flex justify-center gap-2 pt-2">
            {!notFound && (
              <Button variant="outline" onClick={() => void detailQuery.refetch()}>
                Retry
              </Button>
            )}
            <Button asChild variant="outline">
              <Link to="/potholes">All potholes</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const { pothole, events, reports, repairs } = detailQuery.data
  const meta = reportStatusMeta(pothole.status)

  // Repair-flow surfaces, by viewer role:
  //  - repairer: the state machine for the open job
  //  - residents/admin: the verdict card while a repair awaits verification
  const openRepair = pickOpenRepair(repairs)
  const verificationRepair =
    repairs.find(
      (repair) =>
        repair.status === 'AWAITING_VERIFICATION' && repair.verifications.myVerdict === null,
    ) ?? null

  return (
    <div className="space-y-4">
      <BackLink />

      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="font-heading text-headline-md tracking-tight text-primary">
            #{pothole.humanCode}
          </h1>
          <p className="text-body-md text-muted-foreground">
            {pothole.streetName ?? 'Unnamed road'} ·{' '}
            {formatCoordinates(pothole.latitude, pothole.longitude)}
          </p>
        </div>
        <StatusBadge status={pothole.status} />
      </header>

      <p className="text-label-md text-muted-foreground">
        {pothole.reportCount} {pothole.reportCount === 1 ? 'report' : 'reports'} ·{' '}
        {pothole.repairsCount} {pothole.repairsCount === 1 ? 'repair' : 'repairs'} · first reported{' '}
        {formatDate(pothole.firstReportedAt)}
      </p>

      {/* Same-origin endpoint that 302s to the stored image. */}
      <div className="overflow-hidden rounded-lg border border-border bg-surface-sunken shadow-card">
        <img
          src={`/api/potholes/${encodeURIComponent(pothole.humanCode)}/photo`}
          alt={`Latest photo of pothole ${pothole.humanCode}`}
          className="aspect-[4/3] w-full object-cover"
        />
      </div>

      <p className="text-body-md text-muted-foreground">{meta.description}</p>

      {canActAsRepairer(user) && (
        openRepair ? (
          <RepairStepper potholeHumanCode={pothole.humanCode} repair={openRepair} />
        ) : (
          <Card>
            <CardContent className="text-body-md text-muted-foreground">
              No repair assigned yet. Once the city puts a crew on this pothole, your job card
              appears here.
            </CardContent>
          </Card>
        )
      )}

      {verificationRepair && user?.role !== 'REPAIRER' && (
        <RepairVerificationCard
          potholeHumanCode={pothole.humanCode}
          repair={verificationRepair}
        />
      )}

      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-label-lg text-muted-foreground">History timeline</h2>
          <PotholeTimeline events={events} />
        </CardContent>
      </Card>

      {repairs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-label-lg text-muted-foreground">
            Repairs ({repairs.length})
          </h2>
          <div className="grid gap-3">
            {repairs.map((repair) => (
              <RepairCard key={repair.id} repair={repair} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-label-lg text-muted-foreground">
          Report history ({reports.length})
        </h2>
        <div className="grid gap-3">
          {reports.map((report) => (
            <ReportHistoryCard key={report.id} report={report} />
          ))}
        </div>
      </section>

      {isAdmin && (
        <>
          <AssignRepairCard potholeHumanCode={pothole.humanCode} />
          <PotholeStatusUpdateCard
            idOrHumanCode={pothole.humanCode}
            status={pothole.status}
            reportCount={pothole.reportCount}
          />
        </>
      )}
    </div>
  )
}

/** Newest-first list; the "open" repair is the first that is not closed out. */
function pickOpenRepair(repairs: readonly Repair[]): Repair | null {
  return repairs.find((repair) => repair.status !== 'VERIFIED_FIXED') ?? null
}

function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2 text-foreground">
      <Link to="/potholes">
        <ChevronLeft className="size-5" aria-hidden="true" />
        Details
      </Link>
    </Button>
  )
}
