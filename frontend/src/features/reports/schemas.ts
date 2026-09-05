import { z } from 'zod'

import { sessionApi } from '@/lib/session-api'

/** GPS fix attached to a report. Mirrors what `navigator.geolocation` gives us. */
export interface ReportLocation {
  latitude: number
  longitude: number
  accuracyMeters?: number
}

const MAX_PHOTO_BYTES = 15 * 1024 * 1024

/**
 * Client-side gate for the new-report form. The wire contract
 * (`CreateReportSchema`) only needs photoKey/latitude/longitude/description —
 * this schema validates the richer pre-upload state (raw File + GPS fix).
 */
export const newReportFormSchema = z.object({
  photo: z
    .instanceof(File, { message: 'Add a photo so the crew can spot the pothole.' })
    .refine(
      (file) => sessionApi.isSupportedContentType(file.type),
      'Unsupported image type. Use a JPEG, PNG or WebP photo.',
    )
    .refine(
      (file) => file.size <= MAX_PHOTO_BYTES,
      'That photo is larger than 15 MB. Pick a smaller one.',
    ),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      accuracyMeters: z.number().optional(),
    })
    .nullable()
    .refine(
      (value): value is ReportLocation => value !== null,
      'Attach your location — it is how the crew finds the spot.',
    ),
  description: z
    .string()
    .trim()
    .min(10, 'Describe the pothole in at least 10 characters.')
    .max(1000, 'Keep the description under 1000 characters.'),
})

export type NewReportFormValues = z.infer<typeof newReportFormSchema>

/** Admin status update form — mirrors the shared StatusUpdateSchema shape. */
export const statusUpdateFormSchema = z.object({
  status: z.enum(['REPORTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED']),
})

export type StatusUpdateFormValues = z.infer<typeof statusUpdateFormSchema>
