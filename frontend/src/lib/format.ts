const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
})

/** "12 Aug 2026, 4:30 pm" from an ISO timestamp; returns the input when unparseable. */
export function formatDateTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp)
  return Number.isNaN(date.getTime()) ? isoTimestamp : dateTimeFormatter.format(date)
}

/** "12 Aug 2026" from an ISO timestamp; returns the input when unparseable. */
export function formatDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp)
  return Number.isNaN(date.getTime()) ? isoTimestamp : dateFormatter.format(date)
}

/** "12.9716° N, 77.5946° E" style coordinate pair. */
export function formatCoordinates(latitude: number, longitude: number): string {
  const latHemisphere = latitude >= 0 ? 'N' : 'S'
  const lngHemisphere = longitude >= 0 ? 'E' : 'W'
  return `${Math.abs(latitude).toFixed(4)}° ${latHemisphere}, ${Math.abs(longitude).toFixed(4)}° ${lngHemisphere}`
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * "just now" / "2h ago" / "3d ago" style relative label for card timestamps,
 * matching the list screens. Falls back to the absolute date beyond a week.
 */
export function formatRelativeDay(isoTimestamp: string, now: Date = new Date()): string {
  const date = new Date(isoTimestamp)
  if (Number.isNaN(date.getTime())) {
    return isoTimestamp
  }

  const elapsed = now.getTime() - date.getTime()
  if (elapsed < MINUTE) return 'just now'
  if (elapsed < HOUR) {
    const minutes = Math.floor(elapsed / MINUTE)
    return `${minutes}m ago`
  }
  if (elapsed < DAY) {
    const hours = Math.floor(elapsed / HOUR)
    return `${hours}h ago`
  }
  if (elapsed < 7 * DAY) {
    const days = Math.floor(elapsed / DAY)
    return `${days}d ago`
  }
  return formatDate(isoTimestamp)
}
