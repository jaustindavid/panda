import { describe, expect, it } from 'vitest'
import { availableGenres, rankDiscovery } from './discovery.ts'
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

  it('excludes not-go-able places', () => {
    expect(ranked.find((d) => d.place.id === 'near-closed')).toBeUndefined()
  })

  it('keeps go-able and hours-unknown', () => {
    expect(ranked.map((d) => d.place.id)).toEqual([
      'near-open', // go-able, nearest
      'far-open', // go-able, farther
      'unknown', // hours-unknown sorts after go-able
    ])
  })

  it('orders go-able before hours-unknown regardless of distance', () => {
    const statuses = ranked.map((d) => d.status)
    expect(statuses).toEqual(['goable', 'goable', 'hours-unknown'])
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
  // Open Wed 11:00–19:00; "now" Wed 17:00, chip 0, 75-min meal.
  const open11to19 = [
    { open: { day: WED, hour: 11, minute: 0 }, close: { day: WED, hour: 19, minute: 0 } },
  ]
  const now = Date.UTC(2026, 0, 7, 17, 0)
  const p = place('p', 0.01, 'pizza_restaurant', open11to19)
  const base = { places: [p], origin: { latitude: 0, longitude: 0 }, nowMs: now }

  it('no travel data: go-able (arrive 17:00, finish 18:15 ≤ 19:00)', () => {
    expect(rankDiscovery({ ...base, arrivalOffsetMin: 0 }).map((d) => d.status)).toEqual([
      'goable',
    ])
  })

  it('a long drive pushes finish past close → not go-able', () => {
    // 90-min drive → arrive 18:30, finish 19:45 > 19:00.
    const r = rankDiscovery({ ...base, arrivalOffsetMin: 0, travelSecondsById: { p: 90 * 60 } })
    expect(r).toEqual([])
  })

  it('annotates travelSeconds and stays go-able for a short drive', () => {
    const r = rankDiscovery({ ...base, arrivalOffsetMin: 0, travelSecondsById: { p: 10 * 60 } })
    expect(r[0].status).toBe('goable')
    expect(r[0].travelSeconds).toBe(600)
  })

  it('null drive time falls back to chip-only (travelSeconds absent)', () => {
    const r = rankDiscovery({ ...base, arrivalOffsetMin: 0, travelSecondsById: { p: null } })
    expect(r[0].status).toBe('goable')
    expect(r[0].travelSeconds).toBeUndefined()
  })
})
