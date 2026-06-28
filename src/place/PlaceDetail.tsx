import { formatDistance } from '../lib/distance.ts'
import type { DiscoveryPlace } from '../lib/discovery.ts'
import { NotesSection } from './NotesSection.tsx'

interface PlaceDetailProps {
  item: DiscoveryPlace
  onBack: () => void
}

/** Place detail (PRD §7 F4): the place's basics (reused from the discovery
 *  payload — no extra Maps call) + the circle's shared notes. */
export function PlaceDetail({ item, onBack }: PlaceDetailProps) {
  const unknown = item.status === 'hours-unknown'
  return (
    <div className="flex h-full flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-sm text-slate-400"
      >
        ← Back
      </button>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">{item.place.name}</h1>
          <p className="text-sm text-slate-400">
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
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <NotesSection placeId={item.place.id} />
      </div>
    </div>
  )
}
