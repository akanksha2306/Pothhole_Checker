import { ClipboardList, Plus } from 'lucide-react'
import { Link } from 'react-router'

import { EmptyState } from '@/components/molecules/empty-state'
import { FullPageLoader } from '@/components/molecules/full-page-loader'
import { LoadMoreButton } from '@/components/molecules/load-more-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ReportListItem } from '@/features/reports/organisms/report-list-item'
import { useMyReports } from '@/features/potholes/queries'
import { errorMessage } from '@/lib/error-message'

/** Citizen flow: every report this account has filed, with its pothole status. */
export function MyReportsPage() {
  const reportsQuery = useMyReports()
  const reports = reportsQuery.data?.pages.flatMap((page) => page.items) ?? []

  if (reportsQuery.isPending) {
    return <FullPageLoader label="Loading your reports…" />
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-headline-md tracking-tight">My Reports</h1>
          <p className="text-body-md text-muted-foreground">
            {reports.length} report{reports.length === 1 ? '' : 's'} filed from this account
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/report/new">
            <Plus className="size-4" aria-hidden="true" />
            New
          </Link>
        </Button>
      </header>

      {reportsQuery.isError && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p role="alert" className="text-body-md text-destructive">
              {errorMessage(reportsQuery.error, 'Could not load your reports.')}
            </p>
            <Button variant="outline" size="sm" onClick={() => void reportsQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {reports.length === 0 && !reportsQuery.isError ? (
        <EmptyState
          icon={ClipboardList}
          title="No reports yet"
          description="Spotted a pothole? File your first report with a photo and a location."
          action={
            <Button asChild>
              <Link to="/report/new">
                <Plus className="size-5" aria-hidden="true" />
                Report a pothole
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {reports.map((report) => (
            <ReportListItem
              key={report.id}
              report={report}
              href={`/potholes/${report.pothole.humanCode}`}
            />
          ))}
        </div>
      )}

      {reportsQuery.hasNextPage && (
        <LoadMoreButton
          onClick={() => void reportsQuery.fetchNextPage()}
          loading={reportsQuery.isFetchingNextPage}
        />
      )}
    </div>
  )
}
