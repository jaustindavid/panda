import { formatDistance } from '../lib/distance.ts'
import type { GoableStatus } from '../lib/goable.ts'
import type { Place } from '../lib/places.ts'
import { PlaceActions } from './PlaceActions.tsx'
import { PlaceVisits } from './PlaceVisits.tsx'
import { OverrideControl } from './OverrideControl.tsx'
import { NotesSection } from './NotesSection.tsx'

interface PlaceDetailProps {
  place: Place
  genre: string
  /** Null when opened cold (deep link) without a known user location. */
  distanceMeters: number | null
  status: GoableStatus
  onBack: () => void
  /** Called after any change so discovery can re-pull. */
  onChanged?: () => void
}

function StatusBadge({ status }: { status: GoableStatus }) {
  if (status === 'hours-unknown') {
    return (
      <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-300">
        Hours unknown
      </span>
    )
  }
  if (status === 'not-goable') {
    return (
      <span className="shrink-0 rounded-full bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-300">
        Not go-able now
      </span>
    )
  }
  return (
    <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">
      Go-able
    </span>
  )
}

/** Place detail (PRD §7 F3/F4/F4b/F7/F8): basics + save/block actions,
 *  here-now visits, the good-time-to-go override, and shared notes. */
export function PlaceDetail({
  place,
  genre,
  distanceMeters,
  status,
  onBack,
  onChanged,
}: PlaceDetailProps) {
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
          <h1 className="text-xl font-semibold">{place.name}</h1>
          <p className="text-sm text-slate-400">
            {genre}
            {distanceMeters != null && ` · ${formatDistance(distanceMeters)}`}
          </p>
          {place.formattedAddress != null && (
            <p className="mt-0.5 truncate text-sm text-slate-500">
              {place.formattedAddress}
            </p>
          )}
        </div>
        <StatusBadge status={status} />
      </div>

      <PlaceActions place={place} onChanged={onChanged} />

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
        <PlaceVisits placeId={place.id} onChanged={onChanged} />
        <OverrideControl placeId={place.id} onChanged={onChanged} />
        <NotesSection placeId={place.id} onChanged={onChanged} />
      </div>
    </div>
  )
}
