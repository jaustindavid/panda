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
  genre: string
  overrideZeroedOut: boolean
}

export interface RankOptions {
  places: Place[]
  origin: LatLng
  nowMs: number
  arrivalOffsetMin: number
  mealDurationMin?: number
  /** placeId → closeBufferMin override (M4 feeds this; none in M2). */
  overrides?: Record<string, number>
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
    const result = evaluateGoable({
      periods: place.periods,
      kitchenPeriods: place.kitchenPeriods,
      closeBufferMin: opts.overrides?.[place.id],
      utcOffsetMinutes: place.utcOffsetMinutes,
      nowMs,
      arrivalOffsetMin,
      mealDurationMin,
    })
    if (result.status === 'not-goable') continue
    out.push({
      place,
      status: result.status,
      distanceMeters: haversineMeters(origin, place.location),
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
