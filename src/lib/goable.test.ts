import { describe, expect, it } from 'vitest'
import { evaluateGoable } from './goable.ts'
import type { GoableInput, OpeningPeriod, TimeOfWeek } from './goable.ts'

// Weekday epochs (UTC) for readable `nowMs` values. Day-of-week (Places:
// 0=Sun..6=Sat): 2026-01-07 = Wed(3), 01-09 = Fri(5), 01-10 = Sat(6),
// 01-11 = Sun(0).
const WED = 3
const FRI = 5
const SAT = 6
const SUN = 0
const utc = (day: number, h: number, m: number) => Date.UTC(2026, 0, day, h, m)

const tw = (day: number, hour: number, minute: number): TimeOfWeek => ({
  day,
  hour,
  minute,
})
const period = (
  od: number,
  oh: number,
  om: number,
  cd: number,
  ch: number,
  cm: number,
): OpeningPeriod => ({ open: tw(od, oh, om), close: tw(cd, ch, cm) })

function input(partial: Partial<GoableInput>): GoableInput {
  return {
    utcOffsetMinutes: 0,
    nowMs: 0,
    arrivalOffsetMin: 15,
    mealDurationMin: 75,
    ...partial,
  }
}

describe('hours-unknown', () => {
  it('reports unknown when periods are undefined', () => {
    expect(evaluateGoable(input({ nowMs: utc(7, 18, 0) })).status).toBe(
      'hours-unknown',
    )
  })
  it('reports unknown for an empty periods array', () => {
    expect(
      evaluateGoable(input({ periods: [], nowMs: utc(7, 18, 0) })).status,
    ).toBe('hours-unknown')
  })
})

describe('24-hour places (no close)', () => {
  it('is always go-able', () => {
    const r = evaluateGoable(
      input({
        periods: [{ open: tw(WED, 0, 0) }],
        nowMs: utc(7, 3, 0),
      }),
    )
    expect(r.status).toBe('goable')
  })
})

describe('simple same-day interval (Wed 11:00–22:00)', () => {
  const periods = [period(WED, 11, 0, WED, 22, 0)]

  it('go-able mid-service', () => {
    // now 18:00, arrive 18:15, finish 19:30 — well inside.
    expect(evaluateGoable(input({ periods, nowMs: utc(7, 18, 0) })).status).toBe(
      'goable',
    )
  })

  it('excludes closing-soon (would finish after close)', () => {
    // now 21:00, arrive 21:15, finish 22:30 > 22:00.
    expect(evaluateGoable(input({ periods, nowMs: utc(7, 21, 0) })).status).toBe(
      'not-goable',
    )
  })

  it('includes opening-soon (opens before arrival)', () => {
    // now 10:30, n=60, arrive 11:30, finish 12:45.
    expect(
      evaluateGoable(
        input({ periods, nowMs: utc(7, 10, 30), arrivalOffsetMin: 60 }),
      ).status,
    ).toBe('goable')
  })

  it('excludes when not yet open at arrival', () => {
    // now 09:00, arrive 09:15 < 11:00 open.
    expect(evaluateGoable(input({ periods, nowMs: utc(7, 9, 0) })).status).toBe(
      'not-goable',
    )
  })

  it('is inclusive at the open boundary (arrival == open)', () => {
    // now 10:45, arrive 11:00, finish 12:15.
    expect(evaluateGoable(input({ periods, nowMs: utc(7, 10, 45) })).status).toBe(
      'goable',
    )
  })

  it('is inclusive at the close boundary (finish == close)', () => {
    // now 20:30, arrive 20:45, finish 22:00 == close.
    expect(evaluateGoable(input({ periods, nowMs: utc(7, 20, 30) })).status).toBe(
      'goable',
    )
  })
})

describe('past-midnight wrap (Fri 18:00–Sat 02:00)', () => {
  const periods = [period(FRI, 18, 0, SAT, 2, 0)]

  it('go-able late on Friday into Saturday', () => {
    // now Fri 23:30, arrive 23:45, finish Sat 01:00.
    expect(evaluateGoable(input({ periods, nowMs: utc(9, 23, 30) })).status).toBe(
      'goable',
    )
  })

  it('excludes once the meal would run past the 02:00 close', () => {
    // now Sat 01:30, arrive 01:45, finish 03:00 > 02:00.
    expect(evaluateGoable(input({ periods, nowMs: utc(10, 1, 30) })).status).toBe(
      'not-goable',
    )
  })
})

describe('week-end wrap (Sat 22:00–Sun 02:00)', () => {
  it('go-able early Sunday against the Saturday-night interval', () => {
    // now Sun 00:30, arrive 00:45, finish 02:00.
    const periods = [period(SAT, 22, 0, SUN, 2, 0)]
    expect(evaluateGoable(input({ periods, nowMs: utc(11, 0, 30) })).status).toBe(
      'goable',
    )
  })
})

describe('split lunch/dinner periods are never merged', () => {
  const periods = [period(WED, 11, 0, WED, 14, 0), period(WED, 17, 0, WED, 22, 0)]

  it('go-able inside the lunch period', () => {
    // now 12:00, arrive 12:15, finish 13:30.
    expect(evaluateGoable(input({ periods, nowMs: utc(7, 12, 0) })).status).toBe(
      'goable',
    )
  })

  it('excludes a meal that would span the lunch→dinner gap', () => {
    // now 13:00, arrive 13:15, finish 14:30 — past lunch close, before dinner.
    expect(evaluateGoable(input({ periods, nowMs: utc(7, 13, 0) })).status).toBe(
      'not-goable',
    )
  })

  it('go-able inside the dinner period', () => {
    expect(evaluateGoable(input({ periods, nowMs: utc(7, 18, 0) })).status).toBe(
      'goable',
    )
  })
})

describe('good-time-to-go override (closeBufferMin)', () => {
  const periods = [period(WED, 11, 0, WED, 22, 0)]

  it('tightens the close (kitchen closes 2h early)', () => {
    // override 120 → effective close 20:00. now 19:30, finish 21:00 > 20:00.
    const r = evaluateGoable(
      input({ periods, closeBufferMin: 120, nowMs: utc(7, 19, 30) }),
    )
    expect(r.status).toBe('not-goable')
    // Same time WITHOUT the override is go-able — proves the override bit.
    expect(evaluateGoable(input({ periods, nowMs: utc(7, 19, 30) })).status).toBe(
      'goable',
    )
  })

  it('clamps + flags an override that would zero out the place', () => {
    // Wed 17:00–22:00, override 400 min (> the 5h window) → close <= open.
    const r = evaluateGoable(
      input({
        periods: [period(WED, 17, 0, WED, 22, 0)],
        closeBufferMin: 400,
        nowMs: utc(7, 18, 0),
      }),
    )
    expect(r.status).toBe('not-goable')
    expect(r.overrideZeroedOut).toBe(true)
  })
})

describe('KITCHEN secondary hours (precedence override > KITCHEN > posted)', () => {
  const periods = [period(WED, 11, 0, WED, 23, 0)]
  const kitchenPeriods = [period(WED, 11, 0, WED, 21, 0)]

  it('KITCHEN tightens the close when present and no override', () => {
    // now 20:30, arrive 20:45, finish 22:00 > kitchen close 21:00.
    expect(
      evaluateGoable(input({ periods, kitchenPeriods, nowMs: utc(7, 20, 30) }))
        .status,
    ).toBe('not-goable')
    // Without KITCHEN, posted close 23:00 makes it go-able.
    expect(evaluateGoable(input({ periods, nowMs: utc(7, 20, 30) })).status).toBe(
      'goable',
    )
  })

  it('override supersedes KITCHEN', () => {
    // override 30 → effective close 22:30 (from posted 23:00), KITCHEN ignored.
    // now 20:30, finish 22:00 <= 22:30.
    expect(
      evaluateGoable(
        input({
          periods,
          kitchenPeriods,
          closeBufferMin: 30,
          nowMs: utc(7, 20, 30),
        }),
      ).status,
    ).toBe('goable')
  })
})

describe('evaluated in the place local time (timezone)', () => {
  const periods = [period(WED, 11, 0, WED, 14, 0)] // Wed 11:00–14:00 local

  it('uses the place utcOffset, not the runner timezone', () => {
    // 2026-01-07 02:00 UTC. In Tokyo (+540) that is Wed 11:00 local → go-able.
    const tokyo = evaluateGoable(
      input({ periods, utcOffsetMinutes: 540, nowMs: utc(7, 2, 0) }),
    )
    expect(tokyo.status).toBe('goable')
    // Same instant at offset 0 is Wed 02:00 local → closed.
    const utc0 = evaluateGoable(
      input({ periods, utcOffsetMinutes: 0, nowMs: utc(7, 2, 0) }),
    )
    expect(utc0.status).toBe('not-goable')
  })
})
