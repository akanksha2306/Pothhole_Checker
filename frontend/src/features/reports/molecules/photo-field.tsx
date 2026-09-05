import { Camera, Image as ImageIcon, LoaderCircle, TriangleAlert, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'

import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { describePhotoContentType } from '@/lib/uploads'
import { cn } from '@/lib/utils'
import type { ExifLocationPrompt } from '@/features/reports/use-photo-geotag'

interface PhotoFieldProps {
  value: File | null
  onChange: (file: File | null) => void
  /** Camera path — the parent embeds the GPS fix before the file is stored. */
  onCameraCapture?: (file: File) => void
  /** Gallery path — the parent reads the original file's EXIF GPS. */
  onGalleryPick?: (file: File) => void
  /** "Geotagging photo…" style overlay while the parent processes the file. */
  processingLabel?: string | null
  /** Offered when a gallery photo carries its own EXIF GPS. */
  exifPrompt?: ExifLocationPrompt | null
  onClearExifPrompt?: () => void
  /** Validation message from the form. */
  error?: string
  disabled?: boolean
}

/**
 * The hero of the report form (Stitch form screen): a 4:3 capture zone with a
 * dashed emerald border and a centred camera action, plus a gallery path so
 * existing photos can be attached. Camera captures are geotagged into the file;
 * gallery picks are asked whether their EXIF location should be used.
 */
export function PhotoField({
  value,
  onChange,
  onCameraCapture,
  onGalleryPick,
  processingLabel = null,
  exifPrompt = null,
  onClearExifPrompt,
  error,
  disabled = false,
}: PhotoFieldProps) {
  const cameraInputId = useId()
  const galleryInputId = useId()
  const previewUrl = usePreviewUrl(value)

  function handleCamera(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    event.target.value = ''
    if (!file) return
    if (onCameraCapture) {
      onCameraCapture(file)
      return
    }
    onChange(file)
  }

  function handleGallery(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    event.target.value = ''
    if (!file) return
    if (onGalleryPick) {
      onGalleryPick(file)
      return
    }
    onChange(file)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={cameraInputId}>Photo</Label>

      <input
        id={cameraInputId}
        type="file"
        accept="image/*"
        capture="environment"
        disabled={disabled}
        className="sr-only"
        onChange={handleCamera}
      />
      <input
        id={galleryInputId}
        type="file"
        accept="image/*"
        disabled={disabled}
        className="sr-only"
        onChange={handleGallery}
      />

      {previewUrl && value ? (
        <div className="relative overflow-hidden rounded-lg border border-primary/30 bg-surface-sunken shadow-card">
          <img
            src={previewUrl}
            alt={`Selected pothole photo (${value.name})`}
            className="aspect-[4/3] w-full object-cover"
          />

          {processingLabel && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70 backdrop-blur-sm">
              <LoaderCircle className="size-5 animate-spin text-primary" aria-hidden="true" />
              <p className="text-label-lg text-foreground">{processingLabel}</p>
            </div>
          )}

          <Button
            type="button"
            variant="secondary"
            size="icon-xs"
            className="absolute top-2 right-2 shadow-card"
            onClick={() => {
              onChange(null)
              onClearExifPrompt?.()
            }}
            aria-label="Remove photo"
            disabled={disabled}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <label
          htmlFor={cameraInputId}
          className={cn(
            'flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-primary/50 bg-primary/5 px-6 text-center transition-colors hover:border-primary/80 hover:bg-primary/10 focus-within:ring-2 focus-within:ring-primary/40',
            disabled && 'pointer-events-none opacity-60',
          )}
        >
          <span className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow">
            <Camera className="size-7" aria-hidden="true" />
          </span>
          <span className="text-label-lg text-primary">Take a photo</span>
          <span className="max-w-[16rem] text-label-md text-muted-foreground">
            Your position is written into the photo — stand right at the pothole
          </span>
        </label>
      )}

      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={galleryInputId}
          className="flex cursor-pointer items-center gap-1.5 text-label-md text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
        >
          <ImageIcon className="size-3.5" aria-hidden="true" />
          Choose from gallery
        </label>
        {processingLabel && !previewUrl && (
          <span className="flex items-center gap-1.5 text-label-md text-muted-foreground">
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
            {processingLabel}
          </span>
        )}
      </div>

      {exifPrompt && (
        <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/10 p-3">
          <p className="text-body-md font-semibold text-foreground">
            This photo has a location — use it?
          </p>
          <p className="text-label-md text-muted-foreground">
            {exifPrompt.coords.latitude.toFixed(5)}, {exifPrompt.coords.longitude.toFixed(5)} —
            from the photo's own EXIF tags.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              size="sm"
              onClick={exifPrompt.accept}
              disabled={disabled}
            >
              Use photo&apos;s location
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                exifPrompt.decline()
                onClearExifPrompt?.()
              }}
              disabled={disabled}
            >
              No, keep current
            </Button>
          </div>
        </div>
      )}

      {value && value.type === 'image/heic' && (
        <p className="flex items-start gap-1.5 text-body-md text-amber-400">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            {describePhotoContentType(value.type)} uploads as-is. If your phone struggles, switch
            the camera to “Most Compatible” for JPEG.
          </span>
        </p>
      )}

      {error && (
        <p role="alert" className="text-body-md text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

/** Object URL lifecycle for the preview thumbnail, revoked on change/unmount. */
function usePreviewUrl(file: File | null): string | null {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  return previewUrl
}
