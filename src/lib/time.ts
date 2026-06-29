/** Wall-clock "h:mm" in the device's local time (PRD §7: "+15 · 7:25").
 *  12-hour, no leading zero on the hour, no am/pm — at-a-glance on a chip. */
export function formatClock(epochMs: number): string {
  const d = new Date(epochMs)
  const h24 = d.getHours()
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

/** Approximate drive time for a card: "~5 min" / "~45 min" / "~1 h 10 min".
 *  Rounds to whole minutes (min "~1 min"); the "~" reflects no live traffic. */
export function formatDriveTime(seconds: number): string {
  const min = Math.max(1, Math.round(seconds / 60))
  if (min < 60) return `~${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `~${h} h` : `~${h} h ${m} min`
}

/** Compact relative time for note timestamps ("just now", "5m", "3h", "2d"),
 *  falling back to M/D past a week. `nowMs` is passed in (pure). */
export function formatRelative(epochMs: number, nowMs: number): string {
  const min = Math.floor((nowMs - epochMs) / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const days = Math.floor(hr / 24)
  if (days < 7) return `${days}d ago`
  const d = new Date(epochMs)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
