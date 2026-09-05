import { LoaderCircle } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { Repair } from 'shared'

import { RepairStatusBadge } from '@/components/molecules/repair-status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { IntegrityNotice } from '@/features/repairs/components/integrity-notice'
import { useAddRepairEvidence, usePickupRepair } from '@/features/repairs/queries'
import type { LatLng } from '@/lib/geo'
import { isApiError } from '@/lib/api'
import { errorMessage } from '@/lib/error-message'
import { uploadReportPhoto } from '@/lib/uploads'
import { cn } from '@/lib/utils'

type RepairerStep =
  | { kind: 'assigned' }
  | { kind: 'capture'; stage: 'before' | 'after' }
  | { kind: 'submitted' }
  | { kind: 'verified' }
  | { kind: 'reopened' }

function deriveStep(repair: Repair): RepairerStep {
  if (repair.status === 'ASSIGNED') return { kind: 'assigned' }
  if (repair.status === 'IN_PROGRESS')
    return { kind: 'capture', stage: repair.before ? 'after' : 'before' }
  if (repair.status === 'AWAITING_VERIFICATION') return { kind: 'submitted' }
  if (repair.status === 'VERIFIED_FIXED') return { kind: 'verified' }
  // REOPENED: residents rejected the last "after" — the crew re-submits evidence.
  return { kind: 'reopened' }
}

const STEP_LABELS = ['Before photo', 'After photo', 'Resident verify'] as const

interface RepairStepperProps {
  potholeHumanCode: string
  repair: Repair
  className?: string
}

/**
 * Repairer state machine for the open repair:
 *   ASSIGNED → Start repair · IN_PROGRESS → capture before/after (GPS bound,
 *   422 integrity messages surface verbatim) · AWAITING_VERIFICATION → waiting.
 */
export function RepairStepper({ potholeHumanCode, repair, className }: RepairStepperProps) {
  const step = deriveStep(repair)
  const pickup = usePickupRepair(potholeHumanCode, repair.id)
  const [actionError, setActionError] = useState<string | null>(null)

  return (
    <Card className={className}>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="font-heading text-headline-sm">Your repair job</CardTitle>
            <p className="text-label-md text-muted-foreground">
              Assigned by {repair.assignedBy.name}
              {repair.note ? ` · ${repair.note}` : ''}
            </p>
          </div>
          <RepairStatusBadge status={repair.status} />
        </div>

        <ol className="flex items-center gap-1.5" aria-label="Repair steps">
          {STEP_LABELS.map((label, index) => {
            const done =
              (index === 0 && repair.before !== null) ||
              (index === 1 && repair.after !== null) ||
              (index === 2 &&
                (repair.status === 'AWAITING_VERIFICATION' ||
                  repair.status === 'VERIFIED_FIXED' ||
                  repair.status === 'REOPENED'))
            return (
              <li key={label} className="flex flex-1 items-center gap-1.5">
                <span
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full text-label-md',
                    done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span
                  className={cn(
                    'text-label-md',
                    done ? 'text-foreground' : 'text-muted-foreground',
                    index < STEP_LABELS.length - 1 && 'flex-1',
                  )}
                >
                  {label}
                </span>
              </li>
            )
          })}
        </ol>
      </CardHeader>

      <CardContent className="space-y-4">
        {actionError && <IntegrityNotice message={actionError} />}

        {step.kind === 'assigned' && (
          <div className="space-y-3">
            <p className="text-body-md text-muted-foreground">
              Job assigned. Head to the pothole, then claim it to start the evidence trail.
            </p>
            <Button
              type="button"
              className="w-full"
              disabled={pickup.isPending}
              onClick={() => {
                setActionError(null)
                pickup.mutate(undefined, { onError: (error) => setActionError(integrity(error)) })
              }}
            >
              {pickup.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
              Start repair
            </Button>
          </div>
        )}

        {(step.kind === 'capture' || step.kind === 'reopened') && (
          <EvidenceCapture
            repairId={repair.id}
            potholeHumanCode={potholeHumanCode}
            stage={step.kind === 'reopened' ? 'after' : step.stage}
            hasBefore={repair.before !== null}
            onSettled={(message) => setActionError(message)}
          />
        )}

        {step.kind === 'submitted' && (
          <div className="space-y-3">
            <div className="rounded-lg bg-violet-500/10 p-4">
              <p className="text-body-md font-semibold text-violet-300">
                Submitted for resident verification
              </p>
              <p className="mt-1 text-body-md text-muted-foreground">
                Residents who reported this pothole are asked to confirm the fix on site. You will
                see the verdicts here — nothing more to do right now.
              </p>
            </div>
            {repair.verifications.total > 0 && (
              <p className="text-label-md text-muted-foreground">
                {repair.verifications.total}{' '}
                {repair.verifications.total === 1 ? 'verdict' : 'verdicts'} so far ·{' '}
                {repair.verifications.fixed} fixed · {repair.verifications.notFixed} not fixed
              </p>
            )}
          </div>
        )}

        {step.kind === 'verified' && (
          <div className="rounded-lg bg-emerald-500/10 p-4">
            <p className="text-body-md font-semibold text-emerald-400">
              Verified fixed by residents
            </p>
            <p className="mt-1 text-body-md text-muted-foreground">
              {repair.verifications.fixed} of {repair.verifications.total}{' '}
              {repair.verifications.total === 1 ? 'verdict' : 'verdicts'} confirmed the fix. Job
              closed.
            </p>
          </div>
        )}

        {step.kind === 'reopened' && (
          <div className="rounded-lg bg-rose-500/10 p-4">
            <p className="text-body-md font-semibold text-rose-400">Reopened by residents</p>
            <p className="mt-1 text-body-md text-muted-foreground">
              The last repair did not hold up. Go back to the pothole and re-submit fresh after
              evidence.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function integrity(error: unknown): string {
  if (isApiError(error)) return error.message
  return errorMessage(error)
}

interface EvidenceCaptureProps {
  repairId: string
  potholeHumanCode: string
  stage: 'before' | 'after'
  hasBefore: boolean
  /** Called with a verbatim integrity message when the server rejects the fix. */
  onSettled: (message: string | null) => void
}

/**
 * Camera capture + GPS-at-shutter upload. The photo is reviewed locally before
 * the evidence POST goes out; the server independently checks the distance.
 */
function EvidenceCapture({
  repairId,
  potholeHumanCode,
  stage,
  hasBefore,
  onSettled,
}: EvidenceCaptureProps) {
  const inputId = useId()
  const mutation = useAddRepairEvidence(potholeHumanCode, repairId, stage)
  const [file, setFile] = useState<File | null>(null)
  const [coords, setCoords] = useState<LatLng | null>(null)
  const [locating, setLocating] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const objectUrl = useRef<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    const url = URL.createObjectURL(file)
    objectUrl.current = url
    setPreviewUrl(url)
    return () => {
      if (objectUrl.current) {
        URL.revokeObjectURL(objectUrl.current)
        objectUrl.current = null
      }
    }
  }, [file])

  function capture(next: File | null) {
    setUploadError(null)
    if (!next) {
      setFile(null)
      setCoords(null)
      return
    }

    // GPS is captured at shutter, together with the frame.
    setFile(next)
    setCoords(null)
    setLocating(true)

    if (!('geolocation' in navigator)) {
      setLocating(false)
      setUploadError('This device does not report a location, so the photo cannot be verified.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setLocating(false)
      },
      () => {
        setLocating(false)
        setUploadError(
          'Could not read your location. Evidence must be captured on site — enable location and retake the photo.',
        )
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    )
  }

  async function submit() {
    if (!file || !coords) return
    setUploadError(null)
    try {
      const upload = await uploadReportPhoto(file)
      await mutation.mutateAsync({
        photoKey: upload.key,
        latitude: coords.latitude,
        longitude: coords.longitude,
      })
      onSettled(null)
      setFile(null)
      setCoords(null)
    } catch (error: unknown) {
      onSettled(integrity(error))
    }
  }

  const busy = mutation.isPending || locating
  const confirmLabel =
    stage === 'before' ? 'Attach before photo' : 'Submit for resident verification'

  return (
    <div className="space-y-3">
      <p className="text-body-md text-muted-foreground">
        {stage === 'before'
          ? hasBefore
            ? 'Re-capture the before photo from the same spot.'
            : 'Stand at the pothole and capture the damage before you start.'
          : 'Capture the finished repair from the same spot as your before photo.'}
      </p>

      <input
        id={inputId}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={busy}
        onChange={(event) => capture(event.target.files?.[0] ?? null)}
      />

      {previewUrl ? (
        <div className="relative overflow-hidden rounded-lg border border-primary/30 bg-surface-sunken">
          <img src={previewUrl} alt={`${stage} repair photo preview`} className="aspect-[4/3] w-full object-cover" />
          <span className="absolute bottom-2 left-2 rounded-full bg-background/80 px-2 py-1 text-label-md text-muted-foreground backdrop-blur-sm">
            {locating ? 'Locking GPS…' : coords ? 'GPS locked' : 'Waiting for GPS'}
          </span>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-primary/50 bg-primary/5 text-center transition-colors hover:border-primary/80 hover:bg-primary/10 focus-within:ring-2 focus-within:ring-primary/40"
        >
          <span className="text-label-lg text-primary">
            Capture {stage} photo
          </span>
          <span className="max-w-[16rem] text-label-md text-muted-foreground">
            Your position is recorded with the photo — stand right at the pothole
          </span>
        </label>
      )}

      {uploadError && <p role="alert" className="text-body-md text-destructive">{uploadError}</p>}

      <Button
        type="button"
        className="w-full"
        disabled={!file || !coords || busy}
        onClick={() => {
          void submit()
        }}
      >
        {mutation.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
        {confirmLabel}
      </Button>
    </div>
  )
}
