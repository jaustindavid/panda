import type { LatLng } from './distance.ts'
import { haversineMeters } from './distance.ts'
import { evaluateGoable } from './goable.ts'
import type { GoableStatus } from './goable.ts'
import { genreLabel } from './genre.ts'
import type { Place } from './places.ts'

export interface DiscoveryPlace {
  place: Place
  /** 'goable' or 'hours-unknown' — 'not-goable' places are excluded (F1). */
  status: Exclude<GoableStatus, 'not-goable'>
  distanceMeters: number
  /** Drive time from the user, seconds (Routes matrix). Absent ⇒ unknown. */
  travelSeconds?: number
  genre: string
  overrideZeroedOut: boolean
}

export interface RankOptions {
  places: Place[]
  origin: LatLng
  nowMs: number
  /** The "leave in" chip offset (minutes). Per-place drive time is added. */
  arrivalOffsetMin: number
  mealDurationMin?: number
  /** placeId → closeBufferMin override (M4 feeds this; none in M2). */
  overrides?: Record<string, number>
  /** placeId → drive seconds (Routes matrix, §11.2 Q9). Added to the chip
   *  offset for that place's arrival; absent/null ⇒ chip-only (graceful
   *  fallback when routing is unavailable). */
  travelSecondsById?: Record<string, number | null>
}

/**
 * Annotate, filter, and sort the fetched places for the discovery list:
 * exclude not-go-able places (PRD §7 F1), keep go-able + hours-unknown, and
 * sort go-able first then hours-unknown, each nearest-first. Pure — chip
 * re-filtering re-runs this client-side, no new Maps call (PRD §8).
 */
export function rankDiscovery(opts: RankOptions): DiscoveryPlace[] {
  const { places, origin, nowMs, arrivalOffsetMin } = opts
  const mealDurationMin = opts.mealDurationMin ?? 75

  const out: DiscoveryPlace[] = []
  for (const place of places) {
    // Per-place arrival = chip ("leave in") + drive time. Unknown drive ⇒
    // add 0, i.e. behave as before routing landed (graceful fallback).
    const driveSec = opts.travelSecondsById?.[place.id]
    const travelMin = driveSec != null ? Math.round(driveSec / 60) : 0
    const result = evaluateGoable({
      periods: place.periods,
      kitchenPeriods: place.kitchenPeriods,
      closeBufferMin: opts.overrides?.[place.id],
      utcOffsetMinutes: place.utcOffsetMinutes,
      nowMs,
      arrivalOffsetMin: arrivalOffsetMin + travelMin,
      mealDurationMin,
    })
    if (result.status === 'not-goable') continue
    out.push({
      place,
      status: result.status,
      distanceMeters: haversineMeters(origin, place.location),
      travelSeconds: driveSec ?? undefined,
      genre: genreLabel(place),
      overrideZeroedOut: result.overrideZeroedOut,
    })
  }

  const rank = (s: DiscoveryPlace['status']) => (s === 'goable' ? 0 : 1)
  out.sort(
    (a, b) => rank(a.status) - rank(b.status) || a.distanceMeters - b.distanceMeters,
  )
  return out
}

/** Distinct genres present in a ranked list, for the filter chips. */
export function availableGenres(list: DiscoveryPlace[]): string[] {
  return [...new Set(list.map((d) => d.genre))].sort()
}
