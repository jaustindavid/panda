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
