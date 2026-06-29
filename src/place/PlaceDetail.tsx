import { formatDistance } from '../lib/distance.ts'
import type { GoableStatus } from '../lib/goable.ts'
import { PlaceVisits } from './PlaceVisits.tsx'
import { OverrideControl } from './OverrideControl.tsx'
import { NotesSection } from './NotesSection.tsx'

interface PlaceDetailProps {
  placeId: string
  name: string
  genre: string
  /** Null when opened cold (deep link) without a known user location. */
  distanceMeters: number | null
  status: GoableStatus
  onBack: () => void
  /** Called after a visit/override/note change so discovery can re-pull. */
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

/** Place detail (PRD §7 F4/F4b/F3): basics + here-now visits, the
 *  good-time-to-go override, and the circle's shared notes. */
export function PlaceDetail({
  placeId,
  name,
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
          <h1 className="text-xl font-semibold">{name}</h1>
          <p className="text-sm text-slate-400">
            {genre}
            {distanceMeters != null && ` · ${formatDistance(distanceMeters)}`}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
        <PlaceVisits placeId={placeId} onChanged={onChanged} />
        <OverrideControl placeId={placeId} onChanged={onChanged} />
        <NotesSection placeId={placeId} onChanged={onChanged} />
      </div>
    </div>
  )
}
