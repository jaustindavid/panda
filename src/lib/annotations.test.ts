import { describe, expect, it } from 'vitest'
import { buildAnnotations } from './annotations.ts'

describe('buildAnnotations', () => {
  it('counts notes per place', () => {
    const a = buildAnnotations(
      [{ placeId: 'p1' }, { placeId: 'p1' }, { placeId: 'p2' }],
      [],
    )
    expect(a.p1.noteCount).toBe(2)
    expect(a.p2.noteCount).toBe(1)
  })

  it('keeps the most recent visit per place', () => {
    const a = buildAnnotations(
      [],
      [
        { placeId: 'p1', at: 100, byName: 'Austin' },
        { placeId: 'p1', at: 300, byName: 'Mel' },
        { placeId: 'p1', at: 200, byName: 'Drew' },
      ],
    )
    expect(a.p1.lastVisitAt).toBe(300)
    expect(a.p1.lastVisitBy).toBe('Mel')
  })

  it('merges notes and visits for the same place', () => {
    const a = buildAnnotations(
      [{ placeId: 'p1' }],
      [{ placeId: 'p1', at: 100, byName: 'Austin' }],
    )
    expect(a.p1).toEqual({ noteCount: 1, lastVisitAt: 100, lastVisitBy: 'Austin' })
  })

  it('ignores visits with no timestamp for "last visit"', () => {
    const a = buildAnnotations([], [{ placeId: 'p1', at: null, byName: 'Austin' }])
    expect(a.p1.lastVisitAt).toBeNull()
  })

  it('returns an empty map for no data', () => {
    expect(buildAnnotations([], [])).toEqual({})
  })
})
