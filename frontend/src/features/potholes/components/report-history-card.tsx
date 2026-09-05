import { ReporterIdentity } from '@/features/reports/molecules/reporter-identity'
import { formatRelativeDay } from '@/lib/format'

interface ReportHistoryCardProps {
  report: {
    id: string
    description: string | null
    createdAt: string
    reporter: { name: string; avatarUrl: string | null }
  }
}

/**
 * One entry in a pothole's report history: photo, reporter, relative date,
 * description. Photos come from GET /api/reports/:reportId/photo.
 */
export function ReportHistoryCard({ report }: ReportHistoryCardProps) {
  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
      <img
        src={`/api/reports/${report.id}/photo`}
        alt={`Photo from report on ${formatRelativeDay(report.createdAt)}`}
        loading="lazy"
        className="aspect-[4/3] w-full bg-surface-sunken object-cover"
      />
      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-3">
          <ReporterIdentity name={report.reporter.name} avatarUrl={report.reporter.avatarUrl} />
          <time className="shrink-0 text-label-md text-muted-foreground">
            {formatRelativeDay(report.createdAt)}
          </time>
        </div>
        <p className="text-body-md text-foreground">
          {report.description && report.description.length > 0
            ? report.description
            : 'No description added.'}
        </p>
      </div>
    </article>
  )
}
