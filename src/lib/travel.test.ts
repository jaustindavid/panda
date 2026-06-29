import { describe, expect, it } from 'vitest'
import { parseDriveSeconds } from './travel.ts'

// parseDriveSeconds folds a Compute Route Matrix response into placeId→seconds
// (PRD §11.2 Q9). Elements arrive unordered, keyed by destinationIndex.

const ids = ['a', 'b', 'c']

describe('parseDriveSeconds', () => {
  it('maps ROUTE_EXISTS elements by destinationIndex, parsing "1234s"', () => {
    const out = parseDriveSeconds(
      [
        { originIndex: 0, destinationIndex: 1, duration: '600s', condition: 'ROUTE_EXISTS' },
        { originIndex: 0, destinationIndex: 0, duration: '1234s', condition: 'ROUTE_EXISTS' },
      ],
      ids,
    )
    expect(out).toEqual({ a: 1234, b: 600 })
  })

  it('skips unreachable (ROUTE_NOT_FOUND) and missing durations', () => {
    const out = parseDriveSeconds(
      [
        { destinationIndex: 0, duration: '300s', condition: 'ROUTE_EXISTS' },
        { destinationIndex: 1, condition: 'ROUTE_NOT_FOUND' },
        { destinationIndex: 2, duration: '999s', condition: undefined },
      ],
      ids,
    )
    expect(out).toEqual({ a: 300 })
  })

  it('ignores out-of-range / absent destination indices', () => {
    const out = parseDriveSeconds(
      [
        { destinationIndex: 9, duration: '100s', condition: 'ROUTE_EXISTS' },
        { duration: '200s', condition: 'ROUTE_EXISTS' },
      ],
      ids,
    )
    expect(out).toEqual({})
  })
})
