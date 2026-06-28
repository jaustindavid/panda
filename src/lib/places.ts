import type { LatLng } from './distance.ts'
import type { OpeningPeriod } from './goable.ts'

const ENDPOINT = 'https://places.googleapis.com/v1/places:searchNearby'

// Field mask kept to the Enterprise (opening-hours) SKU. Deliberately NO
// rating / priceLevel — those bump the call to the pricier Enterprise+
// Atmosphere SKU (PRD §8). One Nearby Search per screen-load; never fan out.
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.location',
  'places.primaryType',
  'places.types',
  'places.utcOffsetMinutes',
  'places.regularOpeningHours',
  'places.regularSecondaryOpeningHours',
].join(',')

/** A restaurant from Nearby Search, normalized to what panda needs. Place
 *  content is used for display only and not persisted beyond the ID (ToS). */
export interface Place {
  id: string
  name: string
  location: LatLng
  primaryType?: string
  types: string[]
  utcOffsetMinutes: number
  periods?: OpeningPeriod[]
  kitchenPeriods?: OpeningPeriod[]
}

interface RawPoint {
  day: number
  hour: number
  minute: number
}
interface RawPeriod {
  open: RawPoint
  close?: RawPoint
}
interface RawSecondaryHours {
  secondaryHoursType?: string
  periods?: RawPeriod[]
}
interface RawPlace {
  id: string
  displayName?: { text?: string }
  location?: { latitude: number; longitude: number }
  primaryType?: string
  types?: string[]
  utcOffsetMinutes?: number
  regularOpeningHours?: { periods?: RawPeriod[] }
  regularSecondaryOpeningHours?: RawSecondaryHours[]
}
interface RawResponse {
  places?: RawPlace[]
}

export interface SearchNearbyOptions {
  apiKey: string
  center: LatLng
  radiusMeters?: number
  maxResultCount?: number
}

/**
 * One Nearby Search for restaurants, nearest-first (PRD §7 F1, §8). Returns up
 * to `maxResultCount` places with their opening hours for the client-side
 * go-able filter. Throws on a non-OK response (incl. the daily quota 429).
 */
export async function searchNearbyRestaurants(
  opts: SearchNearbyOptions,
): Promise<Place[]> {
  const { apiKey, center, radiusMeters = 5000, maxResultCount = 20 } = opts
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes: ['restaurant'],
      maxResultCount,
      rankPreference: 'DISTANCE',
      locationRestriction: { circle: { center, radius: radiusMeters } },
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Places searchNearby failed (${res.status}): ${detail}`)
  }
  const data = (await res.json()) as RawResponse
  return (data.places ?? []).map(mapPlace)
}

function mapPlace(raw: RawPlace): Place {
  const kitchen = raw.regularSecondaryOpeningHours?.find(
    (h) => h.secondaryHoursType === 'KITCHEN',
  )
  return {
    id: raw.id,
    name: raw.displayName?.text ?? '(unnamed)',
    location: {
      latitude: raw.location?.latitude ?? 0,
      longitude: raw.location?.longitude ?? 0,
    },
    primaryType: raw.primaryType,
    types: raw.types ?? [],
    utcOffsetMinutes: raw.utcOffsetMinutes ?? 0,
    periods: raw.regularOpeningHours?.periods,
    kitchenPeriods: kitchen?.periods,
  }
}
