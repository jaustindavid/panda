import { useCallback, useEffect, useState } from 'react'
import type { LatLng } from '../lib/distance.ts'

export type GeoStatus =
  | 'prompting'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'error'

export interface GeoState {
  status: GeoStatus
  coords?: LatLng
  message?: string
}

const GEO_OPTS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 10_000,
  maximumAge: 60_000,
}

const UNAVAILABLE: GeoState = {
  status: 'unavailable',
  message: "This device can't share its location.",
}

/**
 * Transient geolocation for "near me" (PRD §1.4 — used, not stored). Requests
 * on mount; `request()` retries (the graceful fallback for a denial/error,
 * PRD §11.1). Full manual-location entry is deferred (needs Geocoding API).
 */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>(() =>
    'geolocation' in navigator ? { status: 'prompting' } : UNAVAILABLE,
  )

  const onSuccess = useCallback((pos: GeolocationPosition) => {
    setState({
      status: 'granted',
      coords: {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      },
    })
  }, [])

  const onError = useCallback((err: GeolocationPositionError) => {
    setState(
      err.code === err.PERMISSION_DENIED
        ? { status: 'denied', message: 'Location permission denied.' }
        : { status: 'error', message: err.message || "Couldn't get your location." },
    )
  }, [])

  // Retry (event handler — synchronous setState here is fine, not in an effect).
  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState(UNAVAILABLE)
      return
    }
    setState({ status: 'prompting' })
    navigator.geolocation.getCurrentPosition(onSuccess, onError, GEO_OPTS)
  }, [onSuccess, onError])

  // On mount, kick off geolocation directly — state only changes via the async
  // callbacks, so the effect body never sets state synchronously.
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, GEO_OPTS)
    }
  }, [onSuccess, onError])

  return { ...state, request }
}
