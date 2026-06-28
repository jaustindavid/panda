import { describe, expect, it } from 'vitest'
import { formatClock } from './time.ts'

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
