/**
 * Local persistence for the user's community.
 *
 * Backend persistence is pending, so this is localStorage-only under
 * `potholewatch:community`. Reads are defensive: anything malformed or missing
 * simply reads as "no community saved" rather than throwing.
 */

const STORAGE_KEY = 'potholewatch:community'

export interface Community {
  name: string
  /** Locality / area landmark — optional. */
  area?: string
  city: string
  state: string
  pinCode: string
  /** ISO timestamp of when the user saved it. */
  savedAt: string
}

/** Reads the saved community, or null when none exists / the payload is invalid. */
export function loadCommunity(): Community | null {
  if (typeof window === 'undefined') return null

  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    // Private mode / storage blocked: treat as no community.
    return null
  }
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    return isCommunity(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** Persists the community and returns the stored value (with `savedAt`). */
export function saveCommunity(input: Omit<Community, 'savedAt'>): Community {
  const community: Community = { ...input, savedAt: new Date().toISOString() }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(community))
  } catch {
    // Storage full or blocked: the in-memory value still drives this session.
  }

  return community
}

/** Clears the saved community (used when the form is submitted empty-adjacent). */
export function clearCommunity(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to do if storage is unavailable.
  }
}

function isCommunity(value: unknown): value is Community {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.name === 'string' &&
    candidate.name.trim().length > 0 &&
    typeof candidate.city === 'string' &&
    candidate.city.trim().length > 0 &&
    typeof candidate.state === 'string' &&
    candidate.state.trim().length > 0 &&
    typeof candidate.pinCode === 'string' &&
    /^\d{6}$/.test(candidate.pinCode) &&
    (candidate.area === undefined || typeof candidate.area === 'string') &&
    typeof candidate.savedAt === 'string'
  )
}
