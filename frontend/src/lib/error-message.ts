import { isApiError } from '@/lib/api'

/** Best-effort human message for any thrown value. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (isApiError(error)) return error.message
  if (error instanceof Error && error.message.length > 0) return error.message
  return fallback
}
