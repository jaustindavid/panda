import type { LatLng } from './distance.ts'
import { haversineMeters } from './distance.ts'
import { evaluateGoable } from './goable.ts'
import type { GoableStatus } from './goable.ts'
import { genreLabel } from './genre.ts'
import type { Place } from './places.ts'

/** Hard upper bound on a candidate's straight-line distance from the user.
 *  Beyond this, even a go-able favorite is dropped — a place 100 km+ away
 *  isn't a "right now" answer (owner FR: caps far-flung favorites, e.g. home
 *  favorites while travelling). Measured from the user's GPS, not the search
 *  center. */
export const MAX_DISTANCE_M = 100_000

export interface DiscoveryPlace {
  place: Place
  /** 🟢 green / 🟡 yellow / hours-unknown — 🔴 red is excluded (PRD §7 F1). */
  status: Exclude<GoableStatus, 'red'>
  distanceMeters: number
  /** Drive time from the user, seconds (Routes matrix). Absent ⇒ unknown. */
  travelSeconds?: number
  /** The estimated arrival instant actually used for the go-able band (epoch
   *  ms) — chip + drive, or the "meal at" target clock. For display ("arrive
   *  by 7:45"); always consistent with `status` since it's the same value. */
  arrivalMs: number
  genre: string
  /** Plain-English "why" for the band (detail explainer, owner #5). */
  why?: string
}

export interface RankOptions {
  places: Place[]
  origin: LatLng
  nowMs: number
  /** The "leave in" chip offset (minutes). Per-place drive time is added. */
  arrivalOffsetMin: number
  /** placeId → closeBufferMin override (M4 feeds this; none in M2). */
  overrides?: Record<string, number>
  /** placeId → drive seconds (Routes matrix, §11.2 Q9). Added to the chip
   *  offset for that place's arrival; absent/null ⇒ chip-only (graceful
   *  fallback when routing is unavailable). */
  travelSecondsById?: Record<string, number | null>
  /** Default true (relative chips: arrival = chip + drive). False for the
   *  "meal at <time>" absolute target — the clock time IS the arrival, drive
   *  isn't added (you'll leave in time); drive stays annotated for display. */
  includeDriveInArrival?: boolean
}

/**
 * Annotate, filter, and sort the fetched places for the discovery list: drop
 * 🔴 red (PRD §7 F1), keep 🟢 green / 🟡 yellow / hours-unknown, and sort
 * green → yellow → hours-unknown, each nearest-first. Pure — chip re-filtering
 * re-runs this client-side, no new Maps call (PRD §8).
 */
export function rankDiscovery(opts: RankOptions): DiscoveryPlace[] {
  const { places, origin, nowMs, arrivalOffsetMin } = opts

  const out: DiscoveryPlace[] = []
  for (const place of places) {
    // Hard distance cap first (cheap): a place beyond the upper bound is never
    // a "right now" answer, however go-able — drop it before routing/go-able.
    const distanceMeters = haversineMeters(origin, place.location)
    if (distanceMeters > MAX_DISTANCE_M) continue
    // Per-place arrival = chip ("leave in") + drive time. Unknown drive ⇒
    // add 0 (graceful fallback). Target "meal at…" mode adds 0 too (the clock
    // time is the arrival), but still annotates travelSeconds below.
    const driveSec = opts.travelSecondsById?.[place.id]
    const addDrive = opts.includeDriveInArrival !== false
    const travelMin = addDrive && driveSec != null ? Math.round(driveSec / 60) : 0
    const effectiveOffsetMin = arrivalOffsetMin + travelMin
    const result = evaluateGoable({
      periods: place.periods,
      kitchenPeriods: place.kitchenPeriods,
      closeBufferMin: opts.overrides?.[place.id],
      utcOffsetMinutes: place.utcOffsetMinutes,
      nowMs,
      arrivalOffsetMin: effectiveOffsetMin,
    })
    if (result.status === 'red') continue
    out.push({
      place,
      status: result.status,
      distanceMeters,
      travelSeconds: driveSec ?? undefined,
      arrivalMs: nowMs + effectiveOffsetMin * 60_000,
      genre: genreLabel(place),
      why: result.why,
    })
  }

  const rank = (s: DiscoveryPlace['status']) =>
    s === 'green' ? 0 : s === 'yellow' ? 1 : 2
  out.sort(
    (a, b) => rank(a.status) - rank(b.status) || a.distanceMeters - b.distanceMeters,
  )
  return out
}

/** Distinct genres present in a ranked list, for the filter chips. */
export function availableGenres(list: DiscoveryPlace[]): string[] {
  return [...new Set(list.map((d) => d.genre))].sort()
}
