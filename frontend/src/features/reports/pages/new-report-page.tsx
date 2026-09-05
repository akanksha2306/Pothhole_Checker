import { zodResolver } from '@hookform/resolvers/zod'
import { MapPin, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import type { z } from 'zod'
import type { Pothole } from 'shared'

import { PinDropSheet } from '@/features/reports/components/pin-drop-sheet'

import { StatusBadge } from '@/components/molecules/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { GeolocationField } from '@/features/reports/molecules/geolocation-field'
import { PhotoField } from '@/features/reports/molecules/photo-field'
import { useCreateReport, useNearbyPothole } from '@/features/potholes/queries'
import { newReportFormSchema } from '@/features/reports/schemas'
import { usePhotoGeotag } from '@/features/reports/use-photo-geotag'
import { errorMessage } from '@/lib/error-message'
import type { LatLng } from '@/lib/geo'
import type { LocationProvenance } from '@/lib/geotag'
import { formatRelativeDay } from '@/lib/format'
import { uploadReportPhoto } from '@/lib/uploads'

/** Form state as the user is filling it in (nullable fields allowed). */
type FormInput = z.input<typeof newReportFormSchema>
/** Validated values handed to the submit handler (required fields present). */
type FormOutput = z.output<typeof newReportFormSchema>

type SubmitPhase = 'idle' | 'uploading-photo' | 'saving'

const PHASE_LABEL: Record<SubmitPhase, string> = {
  idle: 'Submit report',
  'uploading-photo': 'Uploading photo…',
  saving: 'Saving report…',
}

/**
 * Citizen flow: photo → GPS → SAME/NEW check → create report. When the GPS fix
 * matches a known pothole, the report attaches to it instead of duplicating it.
 */
export function NewReportPage() {
  const navigate = useNavigate()
  const createReport = useCreateReport()
  const [phase, setPhase] = useState<SubmitPhase>('idle')
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [samePothole, setSamePothole] = useState<boolean | null>(null)
  const [provenance, setProvenance] = useState<LocationProvenance | null>(null)
  const [pinSheetOpen, setPinSheetOpen] = useState(false)

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(newReportFormSchema),
    defaultValues: {
      location: null,
      description: '',
    },
    mode: 'onSubmit',
  })

  const location = form.watch('location') ?? null
  const photo = form.watch('photo')

  // Single source of truth for location: live GPS, the photo's EXIF tags, or a
  // dropped pin — whichever the user picked last.
  function setLocation(next: LatLng, source: LocationProvenance) {
    form.setValue('location', next, { shouldValidate: true })
    setProvenance(source)
    // A new position means the SAME/NEW answer no longer holds.
    setSamePothole(null)
  }

  const geotag = usePhotoGeotag({
    location,
    onFile: (file) => form.setValue('photo', file, { shouldValidate: true }),
    onLocationFromPhoto: (coords) => setLocation(coords, 'photo'),
  })

  const readyForNearbyCheck = location !== null && photo !== undefined
  const nearbyQuery = useNearbyPothole(readyForNearbyCheck ? location : null)
  const nearbyPothole = nearbyQuery.data?.pothole ?? null
  const showSameNewCard = nearbyPothole !== null && samePothole === null

  const busy = phase !== 'idle'

  const onSubmit = form.handleSubmit(async (values) => {
    const { photo: file, description } = values
    // The zod schema guarantees a GPS fix is present; the type stays nullable.
    const fix = values.location
    if (!fix) return

    setSubmissionError(null)
    setPhase('uploading-photo')

    try {
      const upload = await uploadReportPhoto(file)
      setPhase('saving')
      const response = await createReport.mutateAsync({
        photoKey: upload.key,
        latitude: fix.latitude,
        longitude: fix.longitude,
        ...(description.trim().length > 0 ? { description: description.trim() } : {}),
        // YES on the SAME/NEW card attaches this report to the existing pothole.
        ...(samePothole && nearbyPothole ? { potholeId: nearbyPothole.id } : {}),
      })
      navigate(`/potholes/${response.pothole.humanCode}`, { state: { justCreated: true } })
    } catch (error: unknown) {
      setPhase('idle')
      setSubmissionError(errorMessage(error))
    }
  })

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="font-heading text-headline-md tracking-tight">New pothole report</h1>
        <p className="text-body-md text-muted-foreground">
          A photo, a position and a sentence on what a driver would hit — that is what makes a
          report actionable.
        </p>
      </header>

      <form
        onSubmit={(event) => {
          void onSubmit(event)
        }}
        noValidate
        className="space-y-5"
      >
        <Controller
          control={form.control}
          name="photo"
          render={({ field, fieldState }) => (
            <PhotoField
              value={field.value ?? null}
              onChange={(next) => {
                // A new photo invalidates the SAME/NEW answer.
                setSamePothole(null)
                field.onChange(next)
              }}
              onCameraCapture={geotag.handleCameraCapture}
              onGalleryPick={geotag.handleGalleryPick}
              processingLabel={geotag.processingLabel}
              exifPrompt={geotag.exifPrompt}
              onClearExifPrompt={geotag.clearExifPrompt}
              error={fieldState.error?.message}
              disabled={busy}
            />
          )}
        />

        <Controller
          control={form.control}
          name="location"
          render={({ field, fieldState }) => (
            <GeolocationField
              value={field.value ?? null}
              onChange={(next) => {
                setSamePothole(null)
                field.onChange(next)
              }}
              provenance={provenance}
              onProvenance={setProvenance}
              onPinDrop={() => setPinSheetOpen(true)}
              error={fieldState.error?.message}
              disabled={busy}
            />
          )}
        />

        {showSameNewCard && nearbyPothole && (
          <SameNewPotholeCard
            pothole={nearbyPothole}
            distanceMeters={nearbyQuery.data?.distanceMeters}
            onAnswer={setSamePothole}
          />
        )}

        {nearbyPothole !== null && samePothole === true && (
          <p role="status" className="rounded-lg bg-primary/10 px-3 py-2.5 text-body-md text-primary">
            This report will be added to #{nearbyPothole.humanCode}.
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={4}
            placeholder="Describe the pothole (e.g. depth, sharp edges) to help crews prioritise…"
            aria-invalid={form.formState.errors.description !== undefined}
            {...form.register('description')}
          />
          {form.formState.errors.description ? (
            <p role="alert" className="text-body-md text-destructive">
              {form.formState.errors.description.message}
            </p>
          ) : (
            <p className="text-label-md text-muted-foreground">
              Optional but strongly recommended — it saves the crew a callback.
            </p>
          )}
        </div>

        {submissionError && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-body-md text-destructive">
            {submissionError}
          </p>
        )}

        {/* Sticky action bar: the submit stays reachable while long content
            (photo preview + SAME/NEW card) pushes the page down. */}
        <div className="sticky bottom-24 -mx-5 mt-2 bg-gradient-to-t from-background via-background/95 to-background/0 px-5 pt-3 pb-4">
          <Button
            type="submit"
            size="lg"
            className="w-full shadow-glow"
            disabled={busy || nearbyQuery.isFetching || showSameNewCard}
          >
            {PHASE_LABEL[phase]}
          </Button>
          <p className="pt-2 text-center text-label-md text-muted-foreground">
            {showSameNewCard
              ? 'Confirm whether this is the same pothole to continue.'
              : nearbyQuery.isFetching
                ? 'Checking for an existing pothole at this location…'
                : 'Photo uploads first, then the report is saved — keep this screen open.'}
          </p>
        </div>
      </form>

      <PinDropSheet
        open={pinSheetOpen}
        initialLocation={location}
        onClose={() => setPinSheetOpen(false)}
        onConfirm={(coords) => setLocation(coords, 'pin')}
      />
    </div>
  )
}

interface SameNewPotholeCardProps {
  pothole: Pothole
  distanceMeters?: number
  onAnswer: (same: boolean) => void
}

/** Her Stitch copy, verbatim: confirm whether the fix matches a known pothole. */
function SameNewPotholeCard({ pothole, distanceMeters, onAnswer }: SameNewPotholeCardProps) {
  const statusLabel =
    pothole.status === 'RESOLVED'
      ? 'fixed'
      : pothole.status === 'IN_PROGRESS'
        ? 'in progress'
        : 'needs attention'

  return (
    <Card className="border-primary/30">
      <CardContent className="space-y-4">
        <p className="text-body-lg font-semibold text-foreground">
          We found an existing pothole at this location.
        </p>

        <div className="space-y-1.5 rounded-lg bg-surface-sunken p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-body-md font-medium text-foreground">
              <MapPin className="size-4 text-primary" aria-hidden="true" />
              {pothole.streetName ?? 'Unnamed road'}
            </p>
            <StatusBadge status={pothole.status} />
          </div>
          <p className="text-label-md text-muted-foreground">
            <span className="font-mono">#{pothole.humanCode}</span>
            {distanceMeters !== undefined && ` · ${Math.round(distanceMeters)}m away`} · Currently:{' '}
            {statusLabel} · {pothole.reportCount}{' '}
            {pothole.reportCount === 1 ? 'report' : 'reports'}
          </p>
          <p className="text-label-md text-muted-foreground">
            Last reported: {formatRelativeDay(pothole.lastReportedAt)} · Last repaired:{' '}
            {pothole.lastRepairedAt ? formatRelativeDay(pothole.lastRepairedAt) : 'never'}
          </p>
        </div>

        <p className="text-body-lg font-semibold text-foreground">Is this the same pothole?</p>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" onClick={() => onAnswer(true)}>
            <ThumbsUp className="size-4" aria-hidden="true" />
            YES, SAME POTHOLE
          </Button>
          <Button type="button" variant="outline" onClick={() => onAnswer(false)}>
            <ThumbsDown className="size-4" aria-hidden="true" />
            NO, NEW POTHOLE
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
