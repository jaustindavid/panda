import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useGeolocation } from '../hooks/useGeolocation.ts'
import { searchNearbyRestaurants } from '../lib/places.ts'
import type { Place } from '../lib/places.ts'
import { availableGenres, rankDiscovery } from '../lib/discovery.ts'
import type { DiscoveryPlace } from '../lib/discovery.ts'
import { buildAnnotations } from '../lib/annotations.ts'
import type { PlaceAnnotation } from '../lib/annotations.ts'
import { loadOverrideMap } from '../lib/overrides.ts'
import { listAllNotes } from '../lib/notes.ts'
import { listVisits } from '../lib/visits.ts'
import { formatClock } from '../lib/time.ts'
import { WhenChips } from './WhenChips.tsx'
import { GenreFilter } from './GenreFilter.tsx'
import { PlaceCard } from './PlaceCard.tsx'
import { PlaceDetail } from '../place/PlaceDetail.tsx'

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-slate-400">
      {children}
    </div>
  )
}

/** Discovery home (PRD §7 F1): geolocation → one Nearby Search → go-able
 *  filter via when-chips (client-side re-filter) → genre filter → list. */
export function DiscoveryScreen() {
  const geo = useGeolocation()
  const [places, setPlaces] = useState<Place[] | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [offset, setOffset] = useState(15) // default +15 (PRD §3)
  const [genre, setGenre] = useState<string | null>(null)
  const [selected, setSelected] = useState<DiscoveryPlace | null>(null)
  // "now" as state (lazy-init, refreshed on a timer) — never Date.now() in
  // render. A minute's granularity is plenty for go-ability.
  const [nowMs, setNowMs] = useState(() => Date.now())
  // Circle's own data (overrides feed the filter; annotations badge cards).
  // Reloaded when returning from a detail (a visit/override/note may change).
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const [annotations, setAnnotations] = useState<Record<string, PlaceAnnotation>>({})
  const [circleRefresh, setCircleRefresh] = useState(0)

  // One Nearby Search per location fix; chip taps re-filter client-side (§8).
  // The effect only sets state from async callbacks (no synchronous setState).
  useEffect(() => {
    if (geo.status !== 'granted' || !geo.coords) return
    const center = geo.coords
    let cancelled = false
    searchNearbyRestaurants({ apiKey: MAPS_KEY, center })
      .then((res) => !cancelled && setPlaces(res))
      .catch(
        (e) => !cancelled && setFetchError(e instanceof Error ? e.message : String(e)),
      )
    return () => {
      cancelled = true
    }
  }, [geo.status, geo.coords])

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Circle data (our own Firestore data — cheap). Best-effort: annotations
  // are non-critical, so a failure just leaves cards unbadged.
  useEffect(() => {
    let cancelled = false
    Promise.all([loadOverrideMap(), listAllNotes(), listVisits()])
      .then(([ov, notes, visits]) => {
        if (cancelled) return
        setOverrides(ov)
        setAnnotations(buildAnnotations(notes, visits))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [circleRefresh])

  // Loading is derived, not stored: granted but no result and no error yet.
  const loading = geo.status === 'granted' && places === null && fetchError === null

  const ranked = useMemo(() => {
    if (!places || !geo.coords) return []
    return rankDiscovery({
      places,
      origin: geo.coords,
      nowMs,
      arrivalOffsetMin: offset,
      overrides,
    })
  }, [places, geo.coords, nowMs, offset, overrides])

  const genres = useMemo(() => availableGenres(ranked), [ranked])
  const shown = genre ? ranked.filter((d) => d.genre === genre) : ranked
  const arrivalLabel = formatClock(nowMs + offset * 60_000)

  if (selected != null) {
    return (
      <PlaceDetail
        item={selected}
        onBack={() => {
          setSelected(null)
          setCircleRefresh((r) => r + 1)
        }}
        onChanged={() => setCircleRefresh((r) => r + 1)}
      />
    )
  }

  if (!MAPS_KEY) {
    return <Centered>Missing Maps API key (VITE_GOOGLE_MAPS_API_KEY).</Centered>
  }

  if (geo.status === 'prompting') {
    return <Centered>Finding where you are…</Centered>
  }
  if (geo.status !== 'granted') {
    return (
      <Centered>
        <p className="text-slate-300">{geo.message ?? 'Location unavailable.'}</p>
        <p className="text-sm">panda needs your location to find places nearby.</p>
        <button
          type="button"
          onClick={geo.request}
          className="mt-1 rounded-full bg-slate-100 px-5 py-2 font-medium text-slate-900"
        >
          Try again
        </button>
      </Centered>
    )
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <WhenChips value={offset} onChange={setOffset} arrivalLabel={arrivalLabel} />
      <GenreFilter genres={genres} selected={genre} onSelect={setGenre} />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && <Centered>Looking for places…</Centered>}
        {!loading && fetchError && (
          <Centered>
            <p className="text-slate-300">Couldn’t load places.</p>
            <p className="text-sm">{fetchError}</p>
          </Centered>
        )}
        {!loading && !fetchError && shown.length === 0 && (
          <Centered>Nothing go-able right now. Try a later arrival.</Centered>
        )}
        {!loading && !fetchError && shown.length > 0 && (
          <ul className="flex flex-col gap-2">
            {shown.map((item) => (
              <PlaceCard
                key={item.place.id}
                item={item}
                annotation={annotations[item.place.id]}
                nowMs={nowMs}
                onSelect={setSelected}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
