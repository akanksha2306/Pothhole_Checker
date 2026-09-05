import { Camera } from 'lucide-react'
import { useState } from 'react'

import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Repair evidence photos are served by `GET /api/repairs/:id/evidence/:stage/photo`
 * (302 → presigned R2 GET). A stage with no captured evidence 404s, so an img
 * that fails to load falls back to the timestamped placeholder.
 */
const EVIDENCE_SERVABLE = true

export function repairEvidencePhotoUrl(repairId: string, stage: 'before' | 'after'): string | null {
  return EVIDENCE_SERVABLE
    ? `/api/repairs/${encodeURIComponent(repairId)}/evidence/${stage}/photo`
    : null
}

interface EvidenceSlotProps {
  repairId: string
  stage: 'before' | 'after'
  /** Captured-at timestamp from the evidence payload. */
  at?: string
  /** Coordinates captured at shutter, shown for the integrity trail. */
  latitude?: number
  longitude?: number
  className?: string
}

/** One before/after slot: real photo when servable, honest placeholder when not. */
export function EvidenceSlot({
  repairId,
  stage,
  at,
  latitude,
  longitude,
  className,
}: EvidenceSlotProps) {
  const url = repairEvidencePhotoUrl(repairId, stage)
  const [failedFor, setFailedFor] = useState<string | null>(null)
  const showImage = url !== null && failedFor !== url

  return (
    <figure className={cn('space-y-1.5', className)}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-surface-sunken">
        {url && showImage ? (
          <img
            src={url}
            alt={`${stage === 'before' ? 'Before' : 'After'} repair evidence`}
            className="size-full object-cover"
            onError={() => setFailedFor(url)}
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Camera className="size-5" aria-hidden="true" />
            <span className="text-label-md capitalize">{stage} photo</span>
            <span className="text-label-md opacity-70">on record, not viewable yet</span>
          </div>
        )}
      </div>
      <figcaption className="space-y-0.5 text-label-md text-muted-foreground">
        <p className="font-medium capitalize text-foreground">{stage}</p>
        {at && <p>{formatDateTime(at)}</p>}
        {latitude !== undefined && longitude !== undefined && (
          <p className="font-mono">
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </p>
        )}
      </figcaption>
    </figure>
  )
}
