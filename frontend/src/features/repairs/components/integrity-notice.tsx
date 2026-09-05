import { ShieldAlert } from 'lucide-react'

/**
 * The product's integrity voice: GPS/time rejections come back 422 with a
 * message like "You are 100 m from pothole #BLR-00007 — go stand at the
 * pothole". Rendered verbatim and prominently, exactly as the backend wrote it.
 */
export function IntegrityNotice({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
        <ShieldAlert className="size-5" aria-hidden="true" />
      </span>
      <div className="space-y-0.5">
        <p className="text-label-lg text-destructive">On-site check failed</p>
        <p className="text-body-md text-destructive">{message}</p>
      </div>
    </div>
  )
}
