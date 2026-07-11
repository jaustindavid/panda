import type { LatLng } from './distance.ts'
import type { OpeningPeriod } from './goable.ts'

const ENDPOINT = 'https://places.googleapis.com/v1/places:searchNearby'

// What counts as "a place to eat" (PRD §11.2 Q11). Table A searchable types,
// so they're valid Nearby `includedTypes`; most granular eateries (bagel_shop,
// coffee_shop, …) also carry one of these three in their `types[]`, so the set
// catches them via Nearby's type-array matching. Owner's guiding examples
// drive it — extend here when a should-be-hit is missed. Used both
// server-side (Nearby filter) and client-side (Text Search, whose
// `includedType` is singular and can't take the set).
//
// `donut_shop` is listed explicitly (not just relied on via `bakery`/`cafe`
// in its types[]): confirmed 2026-07-11 (owner, Sedona) that Nearby Search
// can omit a place Text Search finds fine, for the same Place ID, hours, and
// distance — Google's type-array richness isn't consistent across search
// methods. Matching on `primaryType` directly (via includedTypes) sidesteps
// that inconsistency, so confirmed misses go here rather than relying solely
// on the three broad types.
const EATERY_TYPES = ['restaurant', 'cafe', 'bakery', 'donut_shop']

// The café-hunt set (PRD §7 F9): matched on **primaryType** via Nearby's
// `includedPrimaryTypes`, per the owner ("a specific type of place… there are
// probably a few primary we'd want to filter"). Primary-type matching is what
// keeps the junk out — with plain `includedTypes`, grocery/convenience stores
// leak in via `bakery`/`cafe` in their types[] (Whole Foods, Safeway, ampm —
// verified live in Sedona 2026-07-11) and eat scarce nearest-20 slots. Living
// set — extend on a missed should-be-hit.
export const CAFE_PRIMARY_TYPES = [
  'cafe',
  'coffee_shop',
  'coffee_roastery',
  'bakery',
  'donut_shop',
  'bagel_shop',
  'tea_house',
]

// Field mask kept to the Enterprise (opening-hours) SKU. Deliberately NO
// rating / priceLevel — those bump the call to the pricier Enterprise+
// Atmosphere SKU (PRD §8). `current*OpeningHours` (holiday-aware, ~7-day
// window) sit in the SAME Enterprise SKU as the `regular*` fields (verified
// against Google's data-fields doc, 2026-06-29) — so requesting both is free.
// One Nearby Search per screen-load; never fan out.
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.primaryType',
  'places.types',
  'places.utcOffsetMinutes',
  'places.currentOpeningHours',
  'places.currentSecondaryOpeningHours',
  'places.regularOpeningHours',
  'places.regularSecondaryOpeningHours',
].join(',')

/** A restaurant from Nearby Search, normalized to what panda needs. Place
 *  content is used for display only and not persisted beyond the ID (ToS). */
export interface Place {
  id: string
  name: string
  /** Short address, for telling same-named places apart (Pro field). */
  formattedAddress?: string
  location: LatLng
  primaryType?: string
  types: string[]
  utcOffsetMinutes: number
  periods?: OpeningPeriod[]
  kitchenPeriods?: OpeningPeriod[]
  /** Google's human-readable per-day hours, e.g. "Monday: 9:00 AM – 9:00 PM"
   *  (current-preferred). Display only — for the detail screen (owner #1). */
  weekdayDescriptions?: string[]
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
  formattedAddress?: string
  location?: { latitude: number; longitude: number }
  primaryType?: string
  types?: string[]
  utcOffsetMinutes?: number
  currentOpeningHours?: { periods?: RawPeriod[]; weekdayDescriptions?: string[] }
  currentSecondaryOpeningHours?: RawSecondaryHours[]
  regularOpeningHours?: { periods?: RawPeriod[]; weekdayDescriptions?: string[] }
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
  /** When set, match on **primaryType** (`includedPrimaryTypes`) instead of
   *  the default EATERY_TYPES types-array match — the café hunt (F9). */
  includedPrimaryTypes?: string[]
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
  const typeFilter = opts.includedPrimaryTypes
    ? { includedPrimaryTypes: opts.includedPrimaryTypes }
    : { includedTypes: EATERY_TYPES }
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      ...typeFilter,
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

// Session-scoped name cache for visit-history re-hydration. In-memory only
// (not durable storage) — ToS-compliant, and it dedupes repeat Place Details
// calls within a session against the GetPlaceRequest daily cap (PRD §8).
const nameCache = new Map<string, string>()

/**
 * Re-hydrate a place's display name from its Place ID (Place Details, New).
 * Used by the visits view (PRD §11.2 Q3a — store ID, fetch name on demand).
 * Cached per session; returns a fallback label on error (e.g. quota 429).
 */
export async function getPlaceName(placeId: string, apiKey: string): Promise<string> {
  const cached = nameCache.get(placeId)
  if (cached !== undefined) return cached
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'id,displayName' },
    })
    if (!res.ok) return '(place unavailable)'
    const data = (await res.json()) as { displayName?: { text?: string } }
    const name = data.displayName?.text ?? '(unnamed place)'
    nameCache.set(placeId, name)
    return name
  } catch {
    return '(place unavailable)'
  }
}

const DETAILS_FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'primaryType',
  'types',
  'utcOffsetMinutes',
  'currentOpeningHours',
  'currentSecondaryOpeningHours',
  'regularOpeningHours',
  'regularSecondaryOpeningHours',
].join(',')

/**
 * Full Place Details for one place (used when a detail route is opened
 * cold — deep link / refresh — with no place in the discovery results).
 * Enterprise SKU (hours); on-demand only, not in any list path.
 */
export async function getPlaceDetails(
  placeId: string,
  apiKey: string,
): Promise<Place> {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': DETAILS_FIELD_MASK },
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Place Details failed (${res.status}): ${detail}`)
  }
  return mapPlace((await res.json()) as RawPlace)
}

/**
 * Find eateries by name (Text Search, New) — add-by-name favorites + the
 * genre-scoped re-search (PRD §7 F8, §11.2 Q10/Q11). `bias` ranks nearby
 * matches first but does NOT restrict — "not close" favorites are the point.
 * The API's `includedType` is singular (can't take the multi-type eatery set)
 * and the old strict restaurant-only filter dropped bagel shops / cafés, so we
 * fetch unfiltered and keep only EATERY_TYPES client-side — which also keeps
 * hotels / the Amalfi Coast out. User-triggered (one call per submitted
 * search).
 */
export async function searchTextRestaurants(
  query: string,
  apiKey: string,
  bias?: LatLng,
  maxResultCount = 8,
): Promise<Place[]> {
  const body: Record<string, unknown> = {
    textQuery: query,
    maxResultCount,
  }
  if (bias) body.locationBias = { circle: { center: bias, radius: 50_000 } }
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Places searchText failed (${res.status}): ${detail}`)
  }
  const data = (await res.json()) as RawResponse
  // `includedType` is singular, so enforce the eatery set here (PRD §11.2 Q11).
  return (data.places ?? [])
    .map(mapPlace)
    .filter((p) => p.types.some((t) => EATERY_TYPES.includes(t)))
}

/**
 * Normalize a raw Places result into panda's `Place`. Prefers the
 * holiday-aware `currentOpeningHours` (special days, ~7-day window) over the
 * `regularOpeningHours` weekly schedule, falling back when the API omits it —
 * so a holiday closure the go-able filter would otherwise miss is honored
 * (PRD §11.2 Q2). Same for the (sparse, best-effort) KITCHEN secondary hours.
 * Exported for unit testing the preference. Pure.
 */
export function mapPlace(raw: RawPlace): Place {
  const kitchen =
    raw.currentSecondaryOpeningHours?.find((h) => h.secondaryHoursType === 'KITCHEN') ??
    raw.regularSecondaryOpeningHours?.find((h) => h.secondaryHoursType === 'KITCHEN')
  return {
    id: raw.id,
    name: raw.displayName?.text ?? '(unnamed)',
    formattedAddress: raw.formattedAddress,
    location: {
      latitude: raw.location?.latitude ?? 0,
      longitude: raw.location?.longitude ?? 0,
    },
    primaryType: raw.primaryType,
    types: raw.types ?? [],
    utcOffsetMinutes: raw.utcOffsetMinutes ?? 0,
    // Holiday-closed *today* still lists the window's other days, so current
    // stays non-empty and wins; only an absent/empty current falls back.
    periods: raw.currentOpeningHours?.periods?.length
      ? raw.currentOpeningHours.periods
      : raw.regularOpeningHours?.periods,
    kitchenPeriods: kitchen?.periods,
    weekdayDescriptions:
      raw.currentOpeningHours?.weekdayDescriptions ??
      raw.regularOpeningHours?.weekdayDescriptions,
  }
}
