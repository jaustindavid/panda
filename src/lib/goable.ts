// The go-able filter — panda's core pure function (PRD §3, §11.2 Q1;
// AGENTS.md load-bearing). Answers "is this a real dinner option?" as a
// traffic light, anchored on the KITCHEN close (when they stop serving), not
// the posted door-close:
//
//   🟢 green  — arrive before kitchen close (they'll cook; come on in)
//   🟡 yellow — arrive after kitchen close but at/before posted close
//               (kitchen shut, door open — cutting it close)
//   🔴 red    — arrive after posted close, or before they open (hidden)
//
// Kitchen close, by precedence: circle OVERRIDE (closeBufferMin = minutes
// before posted; our local knowledge) > Google KITCHEN secondary hours >
// posted close − DEFAULT_KITCHEN_BUFFER_MIN (the "unknown" guess). So saved
// places get precise treatment; unknowns turn yellow in the last 45 min.
// Evaluated in the PLACE's local time; never merge separate periods
// (lunch/dinner); defensive past-midnight + week wrap. Hours-unknown places
// are reported as such (shown, not excluded) — the UI decides.

const MINUTES_PER_DAY = 1440
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY

/** For a place with no kitchen-close signal (no override, no KITCHEN hours),
 *  assume the kitchen stops this many minutes before the posted close. The
 *  green→yellow line for unknowns. Owner: 45 (PRD §3). */
export const DEFAULT_KITCHEN_BUFFER_MIN = 45

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
  /** Opening periods — currentOpeningHours (holiday-aware) preferred over
   *  regularOpeningHours by the mapper; undefined/empty ⇒ hours unknown. */
  periods?: OpeningPeriod[]
  /** KITCHEN secondaryHoursType periods, if present (sparse, best-effort).
   *  Current (holiday-aware) preferred over regular by the mapper. */
  kitchenPeriods?: OpeningPeriod[]
  /** Override: minutes before posted close the place really stops seating
   *  (the circle's local knowledge). 0 = "at close" (Baroni's); 15 = Matt's.
   *  Authoritative over KITCHEN + the default buffer. */
  closeBufferMin?: number
  /** Place-local UTC offset in minutes (Maps utcOffsetMinutes). */
  utcOffsetMinutes: number
  /** Current instant, epoch ms. */
  nowMs: number
  /** Arrival offset (chip "leave in" + drive time), minutes from now. */
  arrivalOffsetMin: number
}

export type GoableStatus = 'green' | 'yellow' | 'red' | 'hours-unknown'

export interface GoableResult {
  status: GoableStatus
  /** One-line plain-English "why" for the detail explainer (PRD §7, owner #5);
   *  absent only when hours are unknown. */
  why?: string
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

const RANK = { green: 0, yellow: 1, red: 2 } as const
type Band = keyof typeof RANK

/** Band for one period: 🟢 open ≤ arrive < kitchen, 🟡 kitchen ≤ arrive ≤
 *  posted, 🔴 otherwise — across the cyclic week (arrival may shift ±1 week
 *  to align). Returns the best band any alignment yields. */
function bandFor(
  openWM: number,
  kitchenWM: number,
  postedWM: number,
  arrivalWM: number,
): Band {
  let best: Band = 'red'
  for (const shift of [-MINUTES_PER_WEEK, 0, MINUTES_PER_WEEK]) {
    const a = arrivalWM + shift
    if (a >= openWM && a < kitchenWM) return 'green'
    if (a >= kitchenWM && a <= postedWM) best = 'yellow'
  }
  return best
}

/** Week-minute → a place-local clock string, e.g. 1290 → "9:30 PM". */
function clockOf(wm: number): string {
  const m = ((Math.round(wm) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  let h = Math.floor(m / 60)
  const ap = h < 12 ? 'AM' : 'PM'
  h %= 12
  if (h === 0) h = 12
  return `${h}:${(m % 60).toString().padStart(2, '0')} ${ap}`
}

/** Min distance (week-minutes) from arrival to a period + which side it falls
 *  on — for picking the period to explain and how. */
function nearest(
  openWM: number,
  postedWM: number,
  arrivalWM: number,
): { dist: number; side: 'before' | 'in' | 'after' } {
  let best: { dist: number; side: 'before' | 'in' | 'after' } = {
    dist: Infinity,
    side: 'after',
  }
  for (const shift of [-MINUTES_PER_WEEK, 0, MINUTES_PER_WEEK]) {
    const a = arrivalWM + shift
    const cand =
      a < openWM
        ? { dist: openWM - a, side: 'before' as const }
        : a > postedWM
          ? { dist: a - postedWM, side: 'after' as const }
          : { dist: 0, side: 'in' as const }
    if (cand.dist < best.dist) best = cand
  }
  return best
}

interface RelevantPeriod {
  openWM: number
  kitchenWM: number
  postedWM: number
  dist: number
  side: 'before' | 'in' | 'after'
}

/** Plain-English reason for the band, anchored on the period nearest arrival. */
function buildWhy(status: Band, arrivalWM: number, rel: RelevantPeriod): string {
  const arrive = clockOf(arrivalWM)
  if (status === 'green') {
    return `You'd arrive ~${arrive}; the kitchen's open till ~${clockOf(rel.kitchenWM)}.`
  }
  if (status === 'yellow') {
    return `You'd arrive ~${arrive}; the kitchen closes ~${clockOf(rel.kitchenWM)} (doors ${clockOf(rel.postedWM)}) — cutting it close.`
  }
  if (rel.side === 'before') {
    return `You'd arrive ~${arrive}, before they open at ${clockOf(rel.openWM)}.`
  }
  return `You'd arrive ~${arrive}, after the ${clockOf(rel.postedWM)} close.`
}

/**
 * Evaluate the go-able traffic light for the requested arrival, with a
 * plain-English "why". Pure: all time inputs are passed in (no Date.now()).
 */
export function evaluateGoable(input: GoableInput): GoableResult {
  const { periods, kitchenPeriods, closeBufferMin, utcOffsetMinutes } = input
  const { nowMs, arrivalOffsetMin } = input

  if (!periods || periods.length === 0) {
    return { status: 'hours-unknown' }
  }

  // Convert "now" to the place's local wall clock, then to week-minutes.
  const local = new Date(nowMs + utcOffsetMinutes * 60_000)
  const nowWM =
    local.getUTCDay() * MINUTES_PER_DAY +
    local.getUTCHours() * 60 +
    local.getUTCMinutes()
  const arrivalWM = nowWM + arrivalOffsetMin

  const hasOverride = closeBufferMin !== undefined && closeBufferMin >= 0

  let best: Band = 'red'
  let rel: RelevantPeriod | null = null
  for (const period of periods) {
    const posted = periodToInterval(period)

    // Kitchen close: override > KITCHEN > posted − default buffer.
    let kitchenWM: number
    if (hasOverride) {
      kitchenWM = posted.closeWM - (closeBufferMin as number)
    } else {
      const kClose = kitchenCloseFor(posted, period.open.day, kitchenPeriods)
      kitchenWM = kClose ?? posted.closeWM - DEFAULT_KITCHEN_BUFFER_MIN
    }
    // Clamp into [open, posted]: a buffer larger than the window just means
    // "always cutting it close" (kitchen == open), never negative.
    if (kitchenWM < posted.openWM) kitchenWM = posted.openWM
    if (kitchenWM > posted.closeWM) kitchenWM = posted.closeWM

    const band = bandFor(posted.openWM, kitchenWM, posted.closeWM, arrivalWM)
    if (RANK[band] < RANK[best]) best = band

    // Track the period nearest arrival — it's the one we explain.
    const near = nearest(posted.openWM, posted.closeWM, arrivalWM)
    if (rel === null || near.dist < rel.dist) {
      rel = { openWM: posted.openWM, kitchenWM, postedWM: posted.closeWM, ...near }
    }
  }

  return { status: best, why: rel ? buildWhy(best, arrivalWM, rel) : undefined }
}
