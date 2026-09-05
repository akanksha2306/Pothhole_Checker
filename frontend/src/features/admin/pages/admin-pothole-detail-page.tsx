import { ChevronLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { useAuth } from '@/features/auth/auth-provider'
import { FullPageLoader } from '@/components/molecules/full-page-loader'
import { ReporterIdentity } from '@/features/reports/molecules/reporter-identity'
import { StatusBadge } from '@/components/molecules/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PotholeStatusUpdateCard } from '@/features/potholes/components/pothole-status-update-card'
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

/** Admin pothole detail: same entity page as citizens, plus triage controls. */
export function AdminPotholeDetailPage() {
  const { idOrHumanCode } = useParams()
  const { user } = useAuth()
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
              <Link to="/admin">Back to the queue</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const { pothole, events, reports, repairs } = detailQuery.data
  const meta = reportStatusMeta(pothole.status)
  const openRepair = pickOpenRepair(repairs)
  const verificationRepair =
    repairs.find(
      (repair) =>
        repair.status === 'AWAITING_VERIFICATION' && repair.verifications.myVerdict === null,
    ) ?? null

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
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

      <div className="overflow-hidden rounded-lg border border-border bg-surface-sunken shadow-card">
        <img
          src={`/api/potholes/${encodeURIComponent(pothole.humanCode)}/photo`}
          alt={`Latest photo of pothole ${pothole.humanCode}`}
          className="aspect-[4/3] w-full object-cover"
        />
      </div>

      <p className="text-body-md text-muted-foreground">{meta.description}</p>

      {verificationRepair && (
        <RepairVerificationCard potholeHumanCode={pothole.humanCode} repair={verificationRepair} />
      )}

      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-label-lg text-muted-foreground">History timeline</h2>
          <PotholeTimeline events={events} />
        </CardContent>
      </Card>

      {repairs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-label-lg text-muted-foreground">Repairs ({repairs.length})</h2>
          <div className="grid gap-3">
            {repairs.map((repair) => (
              <RepairCard key={repair.id} repair={repair} />
            ))}
          </div>
        </section>
      )}

      <AssignRepairCard potholeHumanCode={pothole.humanCode} />

      {openRepair && user?.role === 'REPAIRER' && (
        <RepairStepper potholeHumanCode={pothole.humanCode} repair={openRepair} />
      )}

      <PotholeStatusUpdateCard
        idOrHumanCode={pothole.humanCode}
        status={pothole.status}
        reportCount={pothole.reportCount}
      />

      <section className="space-y-3">
        <h2 className="text-label-lg text-muted-foreground">
          Reporter contact ({reports.length} {reports.length === 1 ? 'report' : 'reports'})
        </h2>
        <div className="grid gap-3">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <ReporterIdentity
                    name={report.reporter.name}
                    avatarUrl={report.reporter.avatarUrl}
                    email={report.reporter.email}
                  />
                  <time className="text-label-md text-muted-foreground">
                    {formatDate(report.createdAt)}
                  </time>
                </div>
                <p className="text-body-md text-foreground">
                  {report.description && report.description.length > 0
                    ? report.description
                    : 'No description added.'}
                </p>
                <img
                  src={`/api/reports/${report.id}/photo`}
                  alt={`Photo from ${report.reporter.name}'s report`}
                  loading="lazy"
                  className="aspect-[4/3] w-full rounded-md bg-surface-sunken object-cover"
                />
                <p className="text-label-md text-muted-foreground">
                  Use the email to follow up if the photo or location is unclear.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}

function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2 text-foreground">
      <Link to="/admin">
        <ChevronLeft className="size-5" aria-hidden="true" />
        Queue
      </Link>
    </Button>
  )
}

/** Newest-first list; the "open" repair is the first that is not closed out. */
function pickOpenRepair(repairs: readonly Repair[]): Repair | null {
  return repairs.find((repair) => repair.status !== 'VERIFIED_FIXED') ?? null
}

