import { describe, expect, it } from 'vitest'
import { mapPlace } from './places.ts'

// mapPlace's holiday-aware hours preference (PRD §11.2 Q2): currentOpeningHours
// (special days, ~7-day window) wins over regularOpeningHours, with fallback.
// Periods use the Places Point shape ({ day, hour, minute }); currentOpening-
// Hours points also carry a `date`, which the mapper ignores (day positions it
// in the week — the only thing the go-able filter reads).

const period = (oh: number, ch: number) => ({
  open: { day: 2, hour: oh, minute: 0 },
  close: { day: 2, hour: ch, minute: 0 },
})

describe('mapPlace opening-hours preference', () => {
  it('prefers currentOpeningHours over regularOpeningHours', () => {
    // Holiday: open 9–14 today, vs the regular 9–22.
    const place = mapPlace({
      id: 'x',
      currentOpeningHours: { periods: [period(9, 14)] },
      regularOpeningHours: { periods: [period(9, 22)] },
    })
    expect(place.periods).toEqual([period(9, 14)])
  })

  it('falls back to regularOpeningHours when current is absent', () => {
    const place = mapPlace({
      id: 'x',
      regularOpeningHours: { periods: [period(9, 22)] },
    })
    expect(place.periods).toEqual([period(9, 22)])
  })

  it('falls back to regular when current is present but empty', () => {
    const place = mapPlace({
      id: 'x',
      currentOpeningHours: { periods: [] },
      regularOpeningHours: { periods: [period(9, 22)] },
    })
    expect(place.periods).toEqual([period(9, 22)])
  })

  it('reports hours-unknown (undefined periods) when neither is present', () => {
    expect(mapPlace({ id: 'x' }).periods).toBeUndefined()
  })

  it('prefers the current KITCHEN secondary hours, falling back to regular', () => {
    const current = mapPlace({
      id: 'x',
      currentSecondaryOpeningHours: [
        { secondaryHoursType: 'KITCHEN', periods: [period(9, 13)] },
      ],
      regularSecondaryOpeningHours: [
        { secondaryHoursType: 'KITCHEN', periods: [period(9, 21)] },
      ],
    })
    expect(current.kitchenPeriods).toEqual([period(9, 13)])

    const fallback = mapPlace({
      id: 'x',
      regularSecondaryOpeningHours: [
        { secondaryHoursType: 'KITCHEN', periods: [period(9, 21)] },
      ],
    })
    expect(fallback.kitchenPeriods).toEqual([period(9, 21)])
  })
})
