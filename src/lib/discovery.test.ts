import { describe, expect, it } from 'vitest'
import { availableGenres, findHereNowSuggestion, rankDiscovery } from './discovery.ts'
import type { Place } from './places.ts'

const WED = 3
const nowMs = Date.UTC(2026, 0, 7, 18, 0) // Wed 18:00 UTC

// All at offset 0 so local == UTC. Distances grow with longitude.
function place(
  id: string,
  lng: number,
  primaryType: string,
  periods: Place['periods'],
): Place {
  return {
    id,
    name: id,
    location: { latitude: 0, longitude: lng },
    primaryType,
    types: [primaryType, 'restaurant'],
    utcOffsetMinutes: 0,
    periods,
  }
}

const open11to22 = [
  { open: { day: WED, hour: 11, minute: 0 }, close: { day: WED, hour: 22, minute: 0 } },
]
const closed = [
  { open: { day: WED, hour: 6, minute: 0 }, close: { day: WED, hour: 9, minute: 0 } },
]

describe('rankDiscovery', () => {
  const places = [
    place('far-open', 0.05, 'italian_restaurant', open11to22),
    place('near-open', 0.01, 'sushi_restaurant', open11to22),
    place('near-closed', 0.0, 'thai_restaurant', closed),
    place('unknown', 0.02, 'mexican_restaurant', undefined),
  ]
  const ranked = rankDiscovery({
    places,
    origin: { latitude: 0, longitude: 0 },
    nowMs,
    arrivalOffsetMin: 15,
  })

  it('excludes red (closed-by-arrival) places', () => {
    expect(ranked.find((d) => d.place.id === 'near-closed')).toBeUndefined()
  })

  it('keeps green and hours-unknown', () => {
    expect(ranked.map((d) => d.place.id)).toEqual([
      'near-open', // green, nearest
      'far-open', // green, farther
      'unknown', // hours-unknown sorts after green
    ])
  })

  it('orders green before hours-unknown regardless of distance', () => {
    const statuses = ranked.map((d) => d.status)
    expect(statuses).toEqual(['green', 'green', 'hours-unknown'])
  })

  it('annotates genre', () => {
    expect(ranked[0].genre).toBe('Sushi')
  })
})

describe('rankDiscovery distance cap (100 km upper bound)', () => {
  // At the equator ~111 km per degree of longitude: 0.5° ≈ 56 km, 1.0° ≈ 111 km.
  const near = place('near', 0.5, 'pizza_restaurant', open11to22)
  const far = place('far', 1.0, 'pizza_restaurant', open11to22)
  const ranked = rankDiscovery({
    places: [near, far],
    origin: { latitude: 0, longitude: 0 },
    nowMs,
    arrivalOffsetMin: 15,
  })

  it('keeps a go-able place within 100 km', () => {
    expect(ranked.map((d) => d.place.id)).toContain('near')
  })

  it('drops a go-able place beyond 100 km (however open)', () => {
    expect(ranked.map((d) => d.place.id)).not.toContain('far')
  })
})

describe('availableGenres', () => {
  it('returns distinct sorted genres', () => {
    const ranked = rankDiscovery({
      places: [
        place('a', 0.01, 'sushi_restaurant', open11to22),
        place('b', 0.02, 'italian_restaurant', open11to22),
        place('c', 0.03, 'sushi_restaurant', open11to22),
      ],
      origin: { latitude: 0, longitude: 0 },
      nowMs,
      arrivalOffsetMin: 15,
    })
    expect(availableGenres(ranked)).toEqual(['Italian', 'Sushi'])
  })
})

describe('rankDiscovery travel time (Q9)', () => {
  // Open Wed 11:00–19:00; "now" Wed 17:00, chip 0. Unknown ⇒ kitchen 18:15.
  const open11to19 = [
    { open: { day: WED, hour: 11, minute: 0 }, close: { day: WED, hour: 19, minute: 0 } },
  ]
  const now = Date.UTC(2026, 0, 7, 17, 0)
  const p = place('p', 0.01, 'pizza_restaurant', open11to19)
  const base = { places: [p], origin: { latitude: 0, longitude: 0 }, nowMs: now }

  it('no travel data: green (arrive 17:00 < kitchen 18:15)', () => {
    expect(rankDiscovery({ ...base, arrivalOffsetMin: 0 }).map((d) => d.status)).toEqual([
      'green',
    ])
  })

  it('a drive into the last stretch → yellow (arrive 18:30, kitchen 18:15)', () => {
    const r = rankDiscovery({ ...base, arrivalOffsetMin: 0, travelSecondsById: { p: 90 * 60 } })
    expect(r[0].status).toBe('yellow')
  })

  it('a drive past the posted close → red, excluded (arrive 19:30 > 19:00)', () => {
    const r = rankDiscovery({ ...base, arrivalOffsetMin: 0, travelSecondsById: { p: 150 * 60 } })
    expect(r).toEqual([])
  })

  it('annotates travelSeconds and stays green for a short drive', () => {
    const r = rankDiscovery({ ...base, arrivalOffsetMin: 0, travelSecondsById: { p: 10 * 60 } })
    expect(r[0].status).toBe('green')
    expect(r[0].travelSeconds).toBe(600)
  })

  it('null drive time falls back to chip-only (travelSeconds absent)', () => {
    const r = rankDiscovery({ ...base, arrivalOffsetMin: 0, travelSecondsById: { p: null } })
    expect(r[0].status).toBe('green')
    expect(r[0].travelSeconds).toBeUndefined()
  })

  it('target mode (includeDriveInArrival false): drive not in band, still shown', () => {
    // 90-min drive would push arrival to 18:30 (yellow) in chip mode; in target
    // mode the clock time IS arrival (17:00 → green), but drive stays annotated.
    const r = rankDiscovery({
      ...base,
      arrivalOffsetMin: 0,
      travelSecondsById: { p: 90 * 60 },
      includeDriveInArrival: false,
    })
    expect(r[0].status).toBe('green')
    expect(r[0].travelSeconds).toBe(5400)
  })

  it('arrivalMs is now + chip + drive in chip mode ("arrive by" display)', () => {
    // chip 15 + 20-min drive → arrival 17:35.
    const r = rankDiscovery({
      ...base,
      arrivalOffsetMin: 15,
      travelSecondsById: { p: 20 * 60 },
    })
    expect(r[0].arrivalMs).toBe(now + 35 * 60_000)
  })

  it('arrivalMs ignores drive in target mode — equals the target instant', () => {
    const r = rankDiscovery({
      ...base,
      arrivalOffsetMin: 45, // minutesUntilTarget's result, in the caller
      travelSecondsById: { p: 20 * 60 },
      includeDriveInArrival: false,
    })
    expect(r[0].arrivalMs).toBe(now + 45 * 60_000)
  })
})

describe('rankDiscovery browse mode (the café hunt, F9)', () => {
  // "now" Wed 18:00: open11to22 → green; `closed` (06:00–09:00) → red.
  const nearClosed = place('near-closed', 0.001, 'donut_shop', closed)
  const farOpen = place('far-open', 0.05, 'cafe', open11to22)
  const base = {
    places: [farOpen, nearClosed],
    origin: { latitude: 0, longitude: 0 },
    nowMs,
    arrivalOffsetMin: 15,
  }

  it('keeps red places (time-agnostic: closed-now is still "out there")', () => {
    const r = rankDiscovery({ ...base, browse: true })
    expect(r.map((d) => d.place.id)).toContain('near-closed')
    expect(r.find((d) => d.place.id === 'near-closed')?.status).toBe('red')
  })

  it('sorts purely nearest-first — a closed near place outranks an open far one', () => {
    const r = rankDiscovery({ ...base, browse: true })
    expect(r.map((d) => d.place.id)).toEqual(['near-closed', 'far-open'])
  })

  it('without browse, the same input drops red and leads with the open place', () => {
    const r = rankDiscovery(base)
    expect(r.map((d) => d.place.id)).toEqual(['far-open'])
  })
})

describe('findHereNowSuggestion (the "I\'m here" shortcut)', () => {
  const origin = { latitude: 0, longitude: 0 }
  const near = place('near', 0.0005, 'restaurant', open11to22) // ~56 m
  const far = place('far', 0.003, 'restaurant', open11to22) // ~334 m — outside threshold

  it('suggests the nearest place within the threshold', () => {
    const r = findHereNowSuggestion([near, far], origin, new Set())
    expect(r?.place.id).toBe('near')
  })

  it('returns null when nothing is within the threshold', () => {
    expect(findHereNowSuggestion([far], origin, new Set())).toBeNull()
  })

  it('returns null when the nearest match was dismissed (does not fall through)', () => {
    const r = findHereNowSuggestion([near, far], origin, new Set(['near']))
    expect(r).toBeNull()
  })

  it('ignores go-able status — an hours-unknown place still matches', () => {
    const unknown = place('unknown', 0.0003, 'restaurant', undefined) // ~33 m
    const r = findHereNowSuggestion([unknown], origin, new Set())
    expect(r?.place.id).toBe('unknown')
  })

  it('returns null with no candidates', () => {
    expect(findHereNowSuggestion([], origin, new Set())).toBeNull()
  })
})
