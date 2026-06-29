import type { LatLng } from './distance.ts'

const ENDPOINT = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix'

// Essentials Compute Route Matrix: driving, NO live traffic
// (TRAFFIC_UNAWARE) — solves the "straight-line lies across a river" problem
// (it routes over the bridge) without the Pro traffic SKU. Field mask kept to
// Essentials fields so it never bills Pro. One call covers all destinations
// (≤ elements = destinations), cached per session (PRD §8 / §11.2 Q9).
const FIELD_MASK = 'originIndex,destinationIndex,duration,condition'

interface MatrixElement {
  originIndex?: number
  destinationIndex?: number
  /** Seconds with a trailing "s", e.g. "1234s". */
  duration?: string
  /** ROUTE_EXISTS | ROUTE_NOT_FOUND. */
  condition?: string
}

/**
 * Pure: fold a Compute Route Matrix response (single origin) into a
 * placeId → drive-seconds map. Keeps only ROUTE_EXISTS elements with a parsed
 * duration; unreachable/garbled destinations are simply absent. Exported for
 * unit testing.
 */
export function parseDriveSeconds(
  elements: MatrixElement[],
  destinationIds: string[],
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const el of elements) {
    if (el.condition !== 'ROUTE_EXISTS' || el.duration == null) continue
    const di = el.destinationIndex
    if (di == null || di < 0 || di >= destinationIds.length) continue
    const seconds = parseInt(el.duration, 10) // "1234s" → 1234
    if (!Number.isNaN(seconds)) out[destinationIds[di]] = seconds
  }
  return out
}

/**
 * Drive time (seconds) from one origin to each destination via the Routes API
 * Compute Route Matrix (Essentials, no live traffic). One billed call. Returns
 * a placeId → seconds map (unreachable destinations omitted). Throws on a
 * non-OK response (e.g. Routes API not enabled / quota) — the caller degrades
 * gracefully to chip-only arrival.
 */
export async function computeDriveSeconds(
  origin: LatLng,
  destinations: { id: string; location: LatLng }[],
  apiKey: string,
): Promise<Record<string, number>> {
  if (destinations.length === 0) return {}
  const waypoint = (p: LatLng) => ({
    waypoint: { location: { latLng: { latitude: p.latitude, longitude: p.longitude } } },
  })
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      origins: [waypoint(origin)],
      destinations: destinations.map((d) => waypoint(d.location)),
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_UNAWARE',
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Route Matrix failed (${res.status}): ${detail}`)
  }
  const data = (await res.json()) as MatrixElement[]
  return parseDriveSeconds(data, destinations.map((d) => d.id))
}
