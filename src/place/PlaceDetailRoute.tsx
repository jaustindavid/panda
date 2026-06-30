import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDiscoveryData } from '../discovery/discovery-context.ts'
import { getPlaceDetails } from '../lib/places.ts'
import type { Place } from '../lib/places.ts'
import { evaluateGoable } from '../lib/goable.ts'
import type { GoableStatus } from '../lib/goable.ts'
import { genreLabel } from '../lib/genre.ts'
import { haversineMeters } from '../lib/distance.ts'
import { PlaceDetail } from './PlaceDetail.tsx'

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

/** Resolves a /place/:placeId route to a detail view: from the discovery
 *  results when available (no extra Maps call), else a cold Place Details
 *  fetch (deep link / refresh). */
export function PlaceDetailRoute() {
  const { placeId } = useParams()
  const navigate = useNavigate()
  const d = useDiscoveryData()
  const fromList = placeId ? d.findRanked(placeId) : undefined

  const [fetched, setFetched] = useState<Place | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (placeId == null || fromList != null) return
    let cancelled = false
    getPlaceDetails(placeId, MAPS_KEY)
      .then((p) => !cancelled && setFetched(p))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      cancelled = true
    }
  }, [placeId, fromList])

  const back = () => navigate(-1)

  if (placeId == null) {
    navigate('/', { replace: true })
    return null
  }

  // Common path: the place is in the current discovery results.
  if (fromList != null) {
    return (
      <PlaceDetail
        place={fromList.place}
        genre={fromList.genre}
        distanceMeters={fromList.distanceMeters}
        status={fromList.status}
        onBack={back}
        onChanged={d.reloadCircleData}
      />
    )
  }

  if (error != null) {
    return (
      <div className="flex h-full flex-col gap-3 p-4 text-slate-400">
        <button type="button" onClick={back} className="self-start text-sm">
          ← Back
        </button>
        <p className="text-sm">Couldn’t load this place. {error}</p>
      </div>
    )
  }
  if (fetched == null) {
    return <p className="p-4 text-sm text-slate-500">Loading place…</p>
  }

  // Cold deep-link: build the view from the fetched place.
  const status: GoableStatus = evaluateGoable({
    periods: fetched.periods,
    kitchenPeriods: fetched.kitchenPeriods,
    closeBufferMin: d.overrides[fetched.id],
    utcOffsetMinutes: fetched.utcOffsetMinutes,
    nowMs: d.nowMs,
    arrivalOffsetMin: d.offset,
  }).status
  const distance = d.coords ? haversineMeters(d.coords, fetched.location) : null

  return (
    <PlaceDetail
      place={fetched}
      genre={genreLabel(fetched)}
      distanceMeters={distance}
      status={status}
      onBack={back}
      onChanged={d.reloadCircleData}
    />
  )
}
