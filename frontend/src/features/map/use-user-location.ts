import { useEffect, useState } from 'react'

import type { LatLng } from '@/lib/geo'

export interface UserLocationState {
  /** Fix once available; null until then (and permanently when denied). */
  location: LatLng | null
  /** True when the user declined or the device has no fix — no error drama. */
  denied: boolean
}

/**
 * One-shot GPS read for the map beacon. Denial is a normal outcome here: the
 * caller hides the beacon and centres the map some other way.
 */
export function useUserLocation(): UserLocationState {
  const [state, setState] = useState<UserLocationState>({ location: null, denied: false })

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setState({ location: null, denied: true })
      return
    }

    let cancelled = false
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return
        setState({
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          denied: false,
        })
      },
      () => {
        if (cancelled) return
        setState({ location: null, denied: true })
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    )

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
