import { formatDistance } from '../lib/distance.ts'
import type { DiscoveryPlace } from '../lib/discovery.ts'
import type { PlaceAnnotation } from '../lib/annotations.ts'
import { formatDriveTime, formatRelative } from '../lib/time.ts'

interface PlaceCardProps {
  item: DiscoveryPlace
  annotation?: PlaceAnnotation
  isFavorite?: boolean
  /** Passed from the parent (never Date.now() in render). */
  nowMs: number
  onSelect: (item: DiscoveryPlace) => void
}

/** One discovery result; tap to open detail. Shows a ★ for saved favorites
 *  and circle annotations — note count + last visit (PRD §7 F1). */
export function PlaceCard({
  item,
  annotation,
  isFavorite,
  nowMs,
  onSelect,
}: PlaceCardProps) {
  const badge =
    item.status === 'green'
      ? { cls: 'bg-emerald-500/15 text-emerald-300', label: 'Go-able' }
      : item.status === 'yellow'
        ? { cls: 'bg-amber-500/15 text-amber-300', label: 'Cutting it close' }
        : { cls: 'bg-slate-600/30 text-slate-300', label: 'Hours unknown' }
  const noteCount = annotation?.noteCount ?? 0
  const lastVisitAt = annotation?.lastVisitAt ?? null

  const marks: string[] = []
  if (noteCount > 0) marks.push(`📝 ${noteCount}`)
  if (lastVisitAt != null) marks.push(`📍 ${formatRelative(lastVisitAt, nowMs)}`)

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(item)}
        className="flex w-full items-center justify-between gap-3 rounded-xl bg-slate-900 px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block truncate font-medium">
            {isFavorite && <span className="text-amber-300">★ </span>}
            {item.place.name}
          </span>
          <span className="block truncate text-sm text-slate-400">
            {item.genre} · {formatDistance(item.distanceMeters)}
            {item.travelSeconds != null && ` · ${formatDriveTime(item.travelSeconds)}`}
          </span>
          {marks.length > 0 && (
            <span className="mt-0.5 block truncate text-xs text-slate-500">
              {marks.join('  ')}
            </span>
          )}
        </span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}
        >
          {badge.label}
        </span>
      </button>
    </li>
  )
}
