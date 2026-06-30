import { describe, expect, it } from 'vitest'
import { DEFAULT_KITCHEN_BUFFER_MIN, evaluateGoable } from './goable.ts'
import type { GoableInput, OpeningPeriod, TimeOfWeek } from './goable.ts'

// Day-of-week (Places: 0=Sun..6=Sat): 2026-01-07 = Wed(3), 01-09 = Fri(5),
// 01-10 = Sat(6), 01-11 = Sun(0). arrival = now + 15 (the default chip).
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
  return { utcOffsetMinutes: 0, nowMs: 0, arrivalOffsetMin: 15, ...partial }
}
const statusAt = (partial: Partial<GoableInput>) => evaluateGoable(input(partial)).status

it('default unknown kitchen buffer is 45 min', () => {
  expect(DEFAULT_KITCHEN_BUFFER_MIN).toBe(45)
})

describe('hours-unknown', () => {
  it('undefined periods', () => {
    expect(statusAt({ nowMs: utc(7, 18, 0) })).toBe('hours-unknown')
  })
  it('empty periods array', () => {
    expect(statusAt({ periods: [], nowMs: utc(7, 18, 0) })).toBe('hours-unknown')
  })
})

describe('24-hour places (no close)', () => {
  it('always green', () => {
    expect(statusAt({ periods: [{ open: tw(WED, 0, 0) }], nowMs: utc(7, 3, 0) })).toBe(
      'green',
    )
  })
})

// No override / KITCHEN ⇒ kitchen close = posted 22:00 − 45 = 21:15.
describe('simple interval Wed 11:00–22:00 (unknown ⇒ kitchen 21:15)', () => {
  const periods = [period(WED, 11, 0, WED, 22, 0)]

  it('green well before kitchen close', () => {
    expect(statusAt({ periods, nowMs: utc(7, 18, 0) })).toBe('green') // arrive 18:15
  })
  it('green up to the moment before kitchen close', () => {
    expect(statusAt({ periods, nowMs: utc(7, 20, 59) })).toBe('green') // arrive 21:14
  })
  it('yellow once arrival reaches kitchen close', () => {
    expect(statusAt({ periods, nowMs: utc(7, 21, 0) })).toBe('yellow') // arrive 21:15
  })
  it('yellow in the last stretch (kitchen shut, door open)', () => {
    expect(statusAt({ periods, nowMs: utc(7, 21, 30) })).toBe('yellow') // arrive 21:45
  })
  it('yellow right at the posted close', () => {
    expect(statusAt({ periods, nowMs: utc(7, 21, 45) })).toBe('yellow') // arrive 22:00
  })
  it('red once arrival passes the posted close', () => {
    expect(statusAt({ periods, nowMs: utc(7, 21, 50) })).toBe('red') // arrive 22:05
  })
  it('red before they open', () => {
    expect(statusAt({ periods, nowMs: utc(7, 9, 0) })).toBe('red') // arrive 09:15
  })
  it('green inclusive at the open boundary (arrival == open)', () => {
    expect(statusAt({ periods, nowMs: utc(7, 10, 45) })).toBe('green') // arrive 11:00
  })
})

describe('override (closeBufferMin) = the circle’s kitchen-close', () => {
  const periods = [period(WED, 11, 0, WED, 22, 0)]

  it('Baroni’s (override 0 = at close): green right up to posted close', () => {
    // arrive 21:45 — yellow on the default 21:15, but override 0 ⇒ kitchen 22:00.
    expect(statusAt({ periods, closeBufferMin: 0, nowMs: utc(7, 21, 30) })).toBe('green')
    expect(statusAt({ periods, nowMs: utc(7, 21, 30) })).toBe('yellow') // (no override)
  })
  it('Matt’s (override 15): green before 21:45, yellow after', () => {
    expect(statusAt({ periods, closeBufferMin: 15, nowMs: utc(7, 21, 25) })).toBe('green') // 21:40
    expect(statusAt({ periods, closeBufferMin: 15, nowMs: utc(7, 21, 35) })).toBe('yellow') // 21:50
  })
  it('an override larger than the window clamps to open → never green (yellow)', () => {
    // Wed 17:00–22:00 (5h), override 400 ⇒ kitchen clamps to open 17:00.
    expect(
      statusAt({ periods: [period(WED, 17, 0, WED, 22, 0)], closeBufferMin: 400, nowMs: utc(7, 18, 0) }),
    ).toBe('yellow')
  })
})

describe('KITCHEN secondary hours (precedence override > KITCHEN > default)', () => {
  const periods = [period(WED, 11, 0, WED, 23, 0)]
  const kitchenPeriods = [period(WED, 11, 0, WED, 21, 0)] // kitchen closes 21:00

  it('KITCHEN sets the green→yellow line when present', () => {
    expect(statusAt({ periods, kitchenPeriods, nowMs: utc(7, 21, 0) })).toBe('yellow') // arrive 21:15 ≥ 21:00
    // Without KITCHEN, the default buffer puts kitchen at 22:15 ⇒ still green.
    expect(statusAt({ periods, nowMs: utc(7, 21, 0) })).toBe('green')
  })
  it('override supersedes KITCHEN', () => {
    // override 30 ⇒ kitchen 22:30 (from posted 23:00); KITCHEN 21:00 ignored.
    expect(
      statusAt({ periods, kitchenPeriods, closeBufferMin: 30, nowMs: utc(7, 21, 30) }),
    ).toBe('green') // arrive 21:45 < 22:30
  })
})

describe('past-midnight wrap (Fri 18:00–Sat 02:00 ⇒ kitchen 01:15)', () => {
  const periods = [period(FRI, 18, 0, SAT, 2, 0)]

  it('green late Friday into Saturday', () => {
    expect(statusAt({ periods, nowMs: utc(9, 23, 30) })).toBe('green') // arrive Fri 23:45
  })
  it('yellow after the kitchen close, before the 02:00 door close', () => {
    expect(statusAt({ periods, nowMs: utc(10, 1, 10) })).toBe('yellow') // arrive Sat 01:25
  })
  it('red after the 02:00 close', () => {
    expect(statusAt({ periods, nowMs: utc(10, 2, 0) })).toBe('red') // arrive Sat 02:15
  })
})

describe('week-end wrap (Sat 22:00–Sun 02:00)', () => {
  it('green early Sunday against the Saturday-night interval', () => {
    const periods = [period(SAT, 22, 0, SUN, 2, 0)]
    expect(statusAt({ periods, nowMs: utc(11, 0, 30) })).toBe('green') // arrive Sun 00:45
  })
})

describe('split lunch/dinner periods are never merged', () => {
  const periods = [period(WED, 11, 0, WED, 14, 0), period(WED, 17, 0, WED, 22, 0)]

  it('green inside lunch', () => {
    expect(statusAt({ periods, nowMs: utc(7, 12, 0) })).toBe('green') // arrive 12:15
  })
  it('red in the lunch→dinner gap', () => {
    expect(statusAt({ periods, nowMs: utc(7, 14, 30) })).toBe('red') // arrive 14:45
  })
  it('green inside dinner', () => {
    expect(statusAt({ periods, nowMs: utc(7, 18, 0) })).toBe('green') // arrive 18:15
  })
})

describe('evaluated in the place local time (timezone)', () => {
  const periods = [period(WED, 11, 0, WED, 14, 0)] // Wed 11:00–14:00 local

  it('uses the place utcOffset, not the runner timezone', () => {
    // 2026-01-07 02:00 UTC → Tokyo (+540) Wed 11:00 local, arrive 11:15 → green.
    expect(statusAt({ periods, utcOffsetMinutes: 540, nowMs: utc(7, 2, 0) })).toBe('green')
    // Same instant at offset 0 is Wed 02:00 local → before open → red.
    expect(statusAt({ periods, utcOffsetMinutes: 0, nowMs: utc(7, 2, 0) })).toBe('red')
  })
})

describe('why (the detail explainer, owner #5)', () => {
  const periods = [period(WED, 11, 0, WED, 22, 0)] // unknown ⇒ kitchen 21:15

  it('green explains the kitchen is open', () => {
    expect(evaluateGoable(input({ periods, nowMs: utc(7, 18, 0) })).why).toMatch(
      /kitchen.*open/i,
    )
  })
  it('yellow says cutting it close', () => {
    expect(evaluateGoable(input({ periods, nowMs: utc(7, 21, 30) })).why).toMatch(
      /cutting it close/i,
    )
  })
  it('red after close names the close time', () => {
    expect(evaluateGoable(input({ periods, nowMs: utc(7, 21, 50) })).why).toMatch(
      /after the .* close/i,
    )
  })
  it('red before open names the open time', () => {
    expect(evaluateGoable(input({ periods, nowMs: utc(7, 9, 0) })).why).toMatch(
      /before they open/i,
    )
  })
  it('hours-unknown has no why', () => {
    expect(evaluateGoable(input({ nowMs: utc(7, 18, 0) })).why).toBeUndefined()
  })
})
