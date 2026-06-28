import { describe, expect, it } from 'vitest'
import { formatClock, formatRelative } from './time.ts'

// Constructed with local-time components and read back with local getters, so
// the assertions hold regardless of the machine's timezone.
describe('formatClock', () => {
  it('formats evening time 12-hour with no suffix', () => {
    expect(formatClock(new Date(2026, 0, 7, 19, 25).getTime())).toBe('7:25')
  })
  it('pads minutes', () => {
    expect(formatClock(new Date(2026, 0, 7, 9, 5).getTime())).toBe('9:05')
  })
  it('renders midnight as 12:mm', () => {
    expect(formatClock(new Date(2026, 0, 7, 0, 5).getTime())).toBe('12:05')
  })
  it('renders noon as 12:00', () => {
    expect(formatClock(new Date(2026, 0, 7, 12, 0).getTime())).toBe('12:00')
  })
})

describe('formatRelative', () => {
  const now = 10_000_000_000_000
  const min = 60_000
  it('"just now" under a minute', () => {
    expect(formatRelative(now - 30_000, now)).toBe('just now')
  })
  it('minutes', () => {
    expect(formatRelative(now - 5 * min, now)).toBe('5m ago')
  })
  it('hours', () => {
    expect(formatRelative(now - 3 * 60 * min, now)).toBe('3h ago')
  })
  it('days', () => {
    expect(formatRelative(now - 2 * 24 * 60 * min, now)).toBe('2d ago')
  })
  it('falls back to M/D past a week', () => {
    const epoch = new Date(2026, 5, 1, 12, 0).getTime()
    const weekLater = new Date(2026, 5, 10, 12, 0).getTime()
    expect(formatRelative(epoch, weekLater)).toBe('6/1')
  })
})
