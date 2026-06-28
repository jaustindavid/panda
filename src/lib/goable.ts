// The go-able filter — panda's core pure function (PRD §3, §11.2 Q1;
// AGENTS.md load-bearing). A place is "go-able" when it will be open when we
// ARRIVE (now + n) AND still open when we FINISH eating (arrival + m), within
// ONE continuous open interval. Evaluated in the PLACE's local time.
//
// Precedence for the effective close: override > KITCHEN secondary hours >
// posted hours. Never merge separate periods (lunch/dinner). Defensive
// past-midnight + week wrap. An override that would zero out a place is
// clamped + flagged, not silently applied. Hours-unknown places are reported
// as such (shown, not excluded) — the UI decides.

const MINUTES_PER_DAY = 1440
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY

/** A point in the weekly schedule. day: 0 = Sunday … 6 = Saturday (Places). */
export interface TimeOfWeek {
  day: number
  hour: number
  minute: number
}

/** A Maps opening period. `close` omitted ⇒ open 24h from `open` (Places). */
export interface OpeningPeriod {
  open: TimeOfWeek
  close?: TimeOfWeek
}

export interface GoableInput {
  /** regularOpeningHours.periods — undefined/empty ⇒ hours unknown. */
  periods?: OpeningPeriod[]
  /** KITCHEN secondaryHoursType periods, if present (sparse, best-effort). */
  kitchenPeriods?: OpeningPeriod[]
  /** Good-time-to-go override: minutes before posted close the place really
   *  stops seating. Authoritative over KITCHEN + posted. */
  closeBufferMin?: number
  /** Place-local UTC offset in minutes (Maps utcOffsetMinutes). */
  utcOffsetMinutes: number
  /** Current instant, epoch ms. */
  nowMs: number
  /** Arrival offset n (chip), minutes from now. */
  arrivalOffsetMin: number
  /** Meal duration m, minutes (fixed 75 in v1). */
  mealDurationMin: number
}

export type GoableStatus = 'goable' | 'not-goable' | 'hours-unknown'

export interface GoableResult {
  status: GoableStatus
  /** True when the override would make the place never go-able (the value was
   *  clamped, not silently applied — the UI flags it, F4b). */
  overrideZeroedOut: boolean
}

/** Minutes from the start of the week (Sunday 00:00) for a TimeOfWeek. */
function toWeekMinute(t: TimeOfWeek): number {
  return t.day * MINUTES_PER_DAY + t.hour * 60 + t.minute
}

interface Interval {
  openWM: number
  /** May exceed MINUTES_PER_WEEK when the period wraps past Sat→Sun. */
  closeWM: number
}

/** Normalize a period into an [open, close] week-minute interval, unwrapping
 *  past-midnight / past-week-end closes. Returns the full week for 24h. */
function periodToInterval(p: OpeningPeriod): Interval {
  const openWM = toWeekMinute(p.open)
  if (p.close === undefined) {
    return { openWM, closeWM: openWM + MINUTES_PER_WEEK }
  }
  let closeWM = toWeekMinute(p.close)
  // close at/before open ⇒ the interval crosses midnight (or the week end).
  if (closeWM <= openWM) closeWM += MINUTES_PER_WEEK
  return { openWM, closeWM }
}

/** Does [arrival, finish] fit inside [open, close], accounting for the cyclic
 *  week (the arrival/finish pair may need shifting by ±1 week to align). */
function intervalContains(
  openWM: number,
  closeWM: number,
  arrivalWM: number,
  finishWM: number,
): boolean {
  for (const shift of [-MINUTES_PER_WEEK, 0, MINUTES_PER_WEEK]) {
    if (openWM <= arrivalWM + shift && finishWM + shift <= closeWM) return true
  }
  return false
}

/** The KITCHEN close that applies to a posted period, if any (matched by the
 *  period's open day). KITCHEN tightens the close only — open stays posted. */
function kitchenCloseFor(
  posted: Interval,
  postedOpenDay: number,
  kitchenPeriods: OpeningPeriod[] | undefined,
): number | undefined {
  if (!kitchenPeriods) return undefined
  let tightest: number | undefined
  for (const k of kitchenPeriods) {
    if (k.open.day !== postedOpenDay || k.close === undefined) continue
    const ki = periodToInterval(k)
    // Only count a kitchen close that falls within the posted interval.
    if (ki.closeWM >= posted.openWM && ki.closeWM <= posted.closeWM) {
      tightest = tightest === undefined ? ki.closeWM : Math.min(tightest, ki.closeWM)
    }
  }
  return tightest
}

/**
 * Evaluate whether a place is go-able for the requested arrival + meal.
 * Pure: all time inputs are passed in (no Date.now()).
 */
export function evaluateGoable(input: GoableInput): GoableResult {
  const { periods, kitchenPeriods, closeBufferMin, utcOffsetMinutes } = input
  const { nowMs, arrivalOffsetMin, mealDurationMin } = input

  if (!periods || periods.length === 0) {
    return { status: 'hours-unknown', overrideZeroedOut: false }
  }

  // Convert "now" to the place's local wall clock, then to week-minutes.
  const local = new Date(nowMs + utcOffsetMinutes * 60_000)
  const nowWM =
    local.getUTCDay() * MINUTES_PER_DAY +
    local.getUTCHours() * 60 +
    local.getUTCMinutes()
  const arrivalWM = nowWM + arrivalOffsetMin
  const finishWM = arrivalWM + mealDurationMin

  const hasOverride = closeBufferMin !== undefined && closeBufferMin > 0

  let goable = false
  let overrideZeroedOut = false

  for (const period of periods) {
    const posted = periodToInterval(period)

    // Effective close, applying precedence override > KITCHEN > posted.
    let closeWM = posted.closeWM
    if (hasOverride) {
      closeWM = posted.closeWM - (closeBufferMin as number)
      if (closeWM <= posted.openWM) {
        // Override zeroes out this period — clamp + flag, don't silently apply.
        closeWM = posted.openWM
        overrideZeroedOut = true
      }
    } else {
      const kClose = kitchenCloseFor(posted, period.open.day, kitchenPeriods)
      if (kClose !== undefined) closeWM = Math.min(closeWM, kClose)
    }

    if (intervalContains(posted.openWM, closeWM, arrivalWM, finishWM)) {
      goable = true
    }
  }

  return {
    status: goable ? 'goable' : 'not-goable',
    overrideZeroedOut,
  }
}
