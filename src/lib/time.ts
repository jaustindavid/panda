/** Wall-clock "h:mm" in the device's local time (PRD §7: "+15 · 7:25").
 *  12-hour, no leading zero on the hour, no am/pm — at-a-glance on a chip. */
export function formatClock(epochMs: number): string {
  const d = new Date(epochMs)
  const h24 = d.getHours()
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}
