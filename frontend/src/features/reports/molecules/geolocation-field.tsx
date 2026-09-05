import { Check, Crosshair, LoaderCircle, MapPin } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { PROVENANCE_LABEL, type LocationProvenance } from '@/lib/geotag'
import { formatCoordinates } from '@/lib/format'
import type { ReportLocation } from '@/features/reports/schemas'
import { cn } from '@/lib/utils'

interface GeolocationFieldProps {
  value: ReportLocation | null
  onChange: (value: ReportLocation | null) => void
  /** Where the fix came from — small honest line under the coordinates. */
  provenance?: LocationProvenance | null
  /** Notify the parent when a fresh live fix lands (resets provenance to GPS). */
  onProvenance?: (source: LocationProvenance) => void
  /** Opens the pin-drop map sheet. */
  onPinDrop?: () => void
  /** Validation message from the form. */
  error?: string
  disabled?: boolean
}

type LocateState = 'idle' | 'locating' | 'failed'

/**
 * Location field, per the Stitch form screen: a card-style readout with a green
 * pin and a refresh action on the right. GPS fix is required, so the form
 * blocks submission without it.
 *
 * Refresh always requests a fresh fix (maximumAge 0 once a fix exists) and
 * confirms success with a short "Location updated" flash, so the tap has a
 * visible result.
 */
export function GeolocationField({
  value,
  onChange,
  provenance = null,
  onProvenance,
  onPinDrop,
  error,
  disabled = false,
}: GeolocationFieldProps) {
  const [state, setState] = useState<LocateState>('idle')
  const [deviceError, setDeviceError] = useState<string | null>(null)
  const [fixedAt, setFixedAt] = useState<number | null>(null)
  const [justUpdated, setJustUpdated] = useState(false)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current)
    },
    [],
  )

  function locate() {
    if (!('geolocation' in navigator)) {
      setState('failed')
      setDeviceError('This device does not report a location.')
      return
    }

    setState('locating')
    setDeviceError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          ...(typeof position.coords.accuracy === 'number'
            ? { accuracyMeters: position.coords.accuracy }
            : {}),
        })
        setFixedAt(Date.now())
        onProvenance?.('gps')
        setState('idle')

        // Flash "Location updated" so a re-fix is obviously fresh.
        setJustUpdated(true)
        if (flashTimer.current) clearTimeout(flashTimer.current)
        flashTimer.current = setTimeout(() => setJustUpdated(false), 2_000)
      },
      (positionError) => {
        setState('failed')
        setDeviceError(
          positionError.code === positionError.PERMISSION_DENIED
            ? 'Location permission denied. Enable it for this site, then retry — or move somewhere with a clearer sky view.'
            : 'Could not read your location. Retry from right next to the pothole.',
        )
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        // Never serve a cached position on a manual refresh.
        maximumAge: value ? 0 : 30_000,
      },
    )
  }

  const failure = deviceError ?? error

  return (
    <div className="space-y-2">
      <Label>Location</Label>

      <div
        className={cn(
          'flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-card',
          failure && 'border-destructive/40',
        )}
      >
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-full',
            state === 'locating'
              ? 'bg-primary/15 text-primary'
              : value
                ? 'bg-primary text-primary-foreground'
                : 'bg-primary/10 text-primary',
          )}
        >
          {state === 'locating' ? (
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <Crosshair className="size-5" aria-hidden="true" />
          )}
        </span>

        <div className="min-w-0 flex-1 leading-tight">
          {value ? (
            <>
              <p className="truncate text-body-md font-semibold text-foreground">
                {formatCoordinates(value.latitude, value.longitude)}
              </p>
              <p className="flex flex-wrap items-center gap-x-1.5 text-label-md text-muted-foreground">
                <span>
                  {value.accuracyMeters !== undefined
                    ? `±${Math.round(value.accuracyMeters)} m`
                    : 'Accuracy unknown'}
                </span>
                {fixedAt !== null && <span>· {fixAgeLabel(fixedAt)}</span>}
                {provenance && (
                  <span className="inline-flex items-center gap-1 text-primary">
                    <MapPin className="size-3" aria-hidden="true" />
                    {PROVENANCE_LABEL[provenance]}
                  </span>
                )}
              </p>
            </>
          ) : (
            <>
              <p className="text-body-md font-semibold text-foreground">No location yet</p>
              <p className="text-label-md text-muted-foreground">
                Required — it is how the crew finds the spot
              </p>
            </>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-1.5">
          <Button
            type="button"
            variant={value ? 'secondary' : 'default'}
            size="sm"
            onClick={locate}
            disabled={state === 'locating' || disabled}
          >
            {state === 'locating' ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Crosshair className="size-4" aria-hidden="true" />
            )}
            {value ? 'Refresh' : 'Use GPS'}
          </Button>
          {onPinDrop && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onPinDrop}
              disabled={disabled}
            >
              <MapPin className="size-4" aria-hidden="true" />
              Place pin on map
            </Button>
          )}
        </div>
      </div>

      {justUpdated && !failure && (
        <p role="status" className="flex items-center gap-1.5 text-label-md text-primary">
          <Check className="size-3.5" aria-hidden="true" />
          Location updated
        </p>
      )}

      {failure && (
        <p role="alert" className="text-body-md text-destructive">
          {failure}
        </p>
      )}
    </div>
  )
}

/** "just now" for a fresh fix, then "Nm ago" — makes staleness obvious. */
function fixAgeLabel(fixedAt: number, now: number = Date.now()): string {
  const seconds = Math.floor((now - fixedAt) / 1000)
  if (seconds < 45) return 'just now'
  return `${Math.floor(seconds / 60)}m ago`
}
