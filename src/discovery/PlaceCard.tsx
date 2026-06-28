import { formatDistance } from '../lib/distance.ts'
import type { DiscoveryPlace } from '../lib/discovery.ts'

/** One discovery result. M3 adds notes count + last visit (PRD §7 F1). */
export function PlaceCard({ item }: { item: DiscoveryPlace }) {
  const unknown = item.status === 'hours-unknown'
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl bg-slate-900 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{item.place.name}</p>
        <p className="truncate text-sm text-slate-400">
          {item.genre} · {formatDistance(item.distanceMeters)}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
          unknown
            ? 'bg-amber-500/15 text-amber-300'
            : 'bg-emerald-500/15 text-emerald-300'
        }`}
      >
        {unknown ? 'Hours unknown' : 'Go-able'}
      </span>
    </li>
  )
}
