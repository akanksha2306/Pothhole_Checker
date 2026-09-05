const EARTH_RADIUS_M = 6_371_000

export interface LatLng {
  latitude: number
  longitude: number
}

/** Great-circle distance between two points, in metres. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.latitude - a.latitude)
  const dLng = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** "120m away" / "1.2km away" for callouts and cards. */
export function formatDistance(meters: number): string {
  if (meters < 1_000) {
    return `${Math.round(meters)}m away`
  }
  return `${(meters / 1_000).toFixed(1)}km away`
}

/** Bengaluru city centre — the map's fallback centre when GPS is unavailable. */
export const DEFAULT_MAP_CENTER: LatLng = { latitude: 12.9716, longitude: 77.5946 }
