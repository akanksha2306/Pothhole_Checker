import { z } from 'zod'

/**
 * Community setup form. Required: community name, city, state and a 6-digit
 * PIN code. The locality/area landmark is optional.
 */
export const communityFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter your community or ward name.')
    .max(120, 'Keep the name under 120 characters.'),
  area: z
    .string()
    .trim()
    .max(160, 'Keep the area under 160 characters.')
    .optional()
    .or(z.literal('')),
  city: z
    .string()
    .trim()
    .min(2, 'Enter your city.')
    .max(80, 'Keep the city under 80 characters.'),
  state: z
    .string()
    .trim()
    .min(2, 'Enter your state.')
    .max(80, 'Keep the state under 80 characters.'),
  pinCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'PIN code must be exactly 6 digits.'),
})

export type CommunityFormValues = z.infer<typeof communityFormSchema>
