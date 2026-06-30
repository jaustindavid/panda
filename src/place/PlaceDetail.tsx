import { useState } from 'react'
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
  /** Plain-English reason for the status (owner #5) — tap the badge to see. */
  why?: string
  onBack: () => void
  /** Called after any change so discovery can re-pull. */
  onChanged?: () => void
}

function StatusBadge({ status }: { status: GoableStatus }) {
  const b =
    status === 'green'
      ? { cls: 'bg-emerald-500/15 text-emerald-300', label: 'Go-able' }
      : status === 'yellow'
        ? { cls: 'bg-amber-500/15 text-amber-300', label: 'Cutting it close' }
        : status === 'red'
          ? { cls: 'bg-rose-500/15 text-rose-300', label: 'Not go-able now' }
          : { cls: 'bg-slate-600/30 text-slate-300', label: 'Hours unknown' }
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${b.cls}`}
    >
      {b.label}
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
  why,
  onBack,
  onChanged,
}: PlaceDetailProps) {
  const [showWhy, setShowWhy] = useState(false)
  // Directions in Google Maps — ToS-blessed deep link by Place ID (owner #4).
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    place.name,
  )}&destination_place_id=${place.id}`
  const hours = place.weekdayDescriptions ?? []

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
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-sm text-sky-400"
          >
            🧭 Directions
          </a>
        </div>
        <button
          type="button"
          onClick={() => why != null && setShowWhy((v) => !v)}
          aria-expanded={why != null ? showWhy : undefined}
          className="shrink-0"
        >
          <StatusBadge status={status} />
          {why != null && <span className="ml-1 text-xs text-slate-500">ⓘ</span>}
        </button>
      </div>
      {why != null && showWhy && (
        <p className="-mt-2 text-sm text-slate-400">{why}</p>
      )}

      <PlaceActions place={place} onChanged={onChanged} />

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
        {hours.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Hours
            </h2>
            <ul className="mt-1 space-y-0.5 text-sm text-slate-300">
              {hours.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        )}
        <PlaceVisits placeId={place.id} onChanged={onChanged} />
        <OverrideControl placeId={place.id} onChanged={onChanged} />
        <NotesSection placeId={place.id} onChanged={onChanged} />
      </div>
    </div>
  )
}
