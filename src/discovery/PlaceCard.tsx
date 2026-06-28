import { formatDistance } from '../lib/distance.ts'
import type { DiscoveryPlace } from '../lib/discovery.ts'

interface PlaceCardProps {
  item: DiscoveryPlace
  onSelect: (item: DiscoveryPlace) => void
}

/** One discovery result; tap to open detail + notes. M3 adds notes count +
 *  last visit later (PRD §7 F1). */
export function PlaceCard({ item, onSelect }: PlaceCardProps) {
  const unknown = item.status === 'hours-unknown'
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(item)}
        className="flex w-full items-center justify-between gap-3 rounded-xl bg-slate-900 px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block truncate font-medium">{item.place.name}</span>
          <span className="block truncate text-sm text-slate-400">
            {item.genre} · {formatDistance(item.distanceMeters)}
          </span>
        </span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            unknown
              ? 'bg-amber-500/15 text-amber-300'
              : 'bg-emerald-500/15 text-emerald-300'
          }`}
        >
          {unknown ? 'Hours unknown' : 'Go-able'}
        </span>
      </button>
    </li>
  )
}
