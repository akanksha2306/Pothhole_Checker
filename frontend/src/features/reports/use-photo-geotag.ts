import { useCallback, useEffect, useRef, useState } from 'react'

import type { LatLng } from '@/lib/geo'
import { embedGpsInJpeg, readExifGps } from '@/lib/geotag'

export interface ExifLocationPrompt {
  coords: LatLng
  accept: () => void
  decline: () => void
}

export interface PhotoGeotag {
  /** Shown on the photo preview when a geotag/exif step runs long (>300ms). */
  processingLabel: string | null
  /** Offered when a gallery photo carries its own EXIF GPS. */
  exifPrompt: ExifLocationPrompt | null
  clearExifPrompt: () => void
  /** Camera path: writes the current fix into the JPEG before it is stored. */
  handleCameraCapture: (file: File) => void
  /** Gallery path: reads EXIF GPS from the original file, no rewriting. */
  handleGalleryPick: (file: File) => void
}

interface UsePhotoGeotagOptions {
  /** Current GPS fix; camera captures are only tagged when this exists. */
  location: LatLng | null
  /** Stores the (possibly EXIF-rewritten) file into the form. */
  onFile: (file: File) => void
  /** Moves the report's location to the photo's EXIF coordinates. */
  onLocationFromPhoto: (coords: LatLng) => void
}

/**
 * Geotag orchestration for the report form:
 *  1. camera capture → embed the live fix into the JPEG (JPEG only; HEIC/WebP
 *     skip and stay untagged),
 *  2. gallery pick → read the original file's EXIF GPS and offer it,
 *  3. pin drop lives in the GPS card, not here.
 *
 * All three write into the form's single location state.
 */
export function usePhotoGeotag({
  location,
  onFile,
  onLocationFromPhoto,
}: UsePhotoGeotagOptions): PhotoGeotag {
  const [processingLabel, setProcessingLabel] = useState<string | null>(null)
  const [exifPrompt, setExifPrompt] = useState<ExifLocationPrompt | null>(null)
  const labelTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (labelTimer.current) clearTimeout(labelTimer.current)
    },
    [],
  )

  // Only surface the busy state when the work actually takes a beat.
  function beginProcessing(label: string) {
    if (labelTimer.current) clearTimeout(labelTimer.current)
    labelTimer.current = setTimeout(() => setProcessingLabel(label), 300)
  }

  function endProcessing() {
    if (labelTimer.current) clearTimeout(labelTimer.current)
    labelTimer.current = null
    setProcessingLabel(null)
  }

  const handleCameraCapture = useCallback(
    (file: File) => {
      onFile(file)
      if (!location) {
        // No fix: upload untagged (the report's GPS fields stay source of truth).
        return
      }

      const coords = location
      beginProcessing('Geotagging photo…')
      void embedGpsInJpeg(file, coords)
        .then((tagged) => {
          // Swap in the tagged JPEG; non-JPEG/HEIC/WebP resolve null.
          if (tagged) onFile(tagged)
        })
        .finally(endProcessing)
    },
    [location, onFile],
  )

  const handleGalleryPick = useCallback(
    (file: File) => {
      onFile(file)
      beginProcessing('Reading photo location…')
      void readExifGps(file)
        .then((coords) => {
          if (!coords) return
          setExifPrompt({
            coords,
            accept: () => {
              onLocationFromPhoto(coords)
              setExifPrompt(null)
            },
            decline: () => setExifPrompt(null),
          })
        })
        .finally(endProcessing)
    },
    [onFile, onLocationFromPhoto],
  )

  const clearExifPrompt = useCallback(() => setExifPrompt(null), [])

  return {
    processingLabel,
    exifPrompt,
    clearExifPrompt,
    handleCameraCapture,
    handleGalleryPick,
  }
}
