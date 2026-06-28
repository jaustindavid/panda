import { describe, expect, it } from 'vitest'
import { formatDistance, haversineMeters } from './distance.ts'

describe('haversineMeters', () => {
  it('is zero for the same point', () => {
    const p = { latitude: 37.7749, longitude: -122.4194 }
    expect(haversineMeters(p, p)).toBe(0)
  })

  it('matches a known short distance (~1.6 km within SF)', () => {
    // Ferry Building → Salesforce Tower, ~1.1 km apart.
    const a = { latitude: 37.7955, longitude: -122.3937 }
    const b = { latitude: 37.7897, longitude: -122.3972 }
    const d = haversineMeters(a, b)
    expect(d).toBeGreaterThan(600)
    expect(d).toBeLessThan(900)
  })

  it('approximates one degree of latitude (~111 km)', () => {
    const d = haversineMeters(
      { latitude: 0, longitude: 0 },
      { latitude: 1, longitude: 0 },
    )
    expect(d).toBeGreaterThan(110_000)
    expect(d).toBeLessThan(112_000)
  })
})

describe('formatDistance', () => {
  it('rounds metres to the nearest 10 under 1 km', () => {
    expect(formatDistance(244)).toBe('240 m')
    expect(formatDistance(4)).toBe('0 m')
    expect(formatDistance(5)).toBe('10 m')
  })
  it('uses one decimal km under 10 km', () => {
    expect(formatDistance(1300)).toBe('1.3 km')
  })
  it('uses whole km at/above 10 km', () => {
    expect(formatDistance(12_400)).toBe('12 km')
  })
})
