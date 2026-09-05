import { z } from 'zod'

/**
 * Admin manual status form. RESOLVED is intentionally not an option: the
 * backend refuses it (409) because a pothole is only resolved by a verified
 * repair — that is what the "Assign repair" action is for.
 */
export const potholeStatusFormSchema = z.object({
  status: z.enum(['REPORTED', 'ACKNOWLEDGED', 'IN_PROGRESS']),
  note: z.string().trim().max(280, 'Keep the note under 280 characters.').optional(),
})

export type PotholeStatusFormValues = z.infer<typeof potholeStatusFormSchema>
