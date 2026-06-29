import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDiscoveryData } from './discovery-context.ts'
import { formatClock } from '../lib/time.ts'
import { WhenChips } from './WhenChips.tsx'
import { GenreFilter } from './GenreFilter.tsx'
import { PlaceCard } from './PlaceCard.tsx'

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-slate-400">
      {children}
    </div>
  )
}

/** Discovery home (PRD §7 F1): when-chips (client-side re-filter) → genre
 *  filter → go-able list. Data lives in DiscoveryProvider so opening a detail
 *  and coming back never re-fetches. */
export function DiscoveryScreen() {
  const d = useDiscoveryData()
  const navigate = useNavigate()

  const shown = d.shown
  const arrivalLabel = formatClock(d.nowMs + d.offset * 60_000)

  if (d.geoStatus === 'prompting') {
    return <Centered>Finding where you are…</Centered>
  }
  if (d.geoStatus !== 'granted') {
    return (
      <Centered>
        <p className="text-slate-300">{d.geoMessage ?? 'Location unavailable.'}</p>
        <p className="text-sm">panda needs your location to find places nearby.</p>
        <button
          type="button"
          onClick={d.retryGeo}
          className="mt-1 rounded-full bg-slate-100 px-5 py-2 font-medium text-slate-900"
        >
          Try again
        </button>
      </Centered>
    )
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <WhenChips value={d.offset} onChange={d.setOffset} arrivalLabel={arrivalLabel} />
      <GenreFilter genres={d.genres} selected={d.genre} onSelect={d.setGenre} />
      <button
        type="button"
        onClick={() => navigate('/add')}
        className="self-start text-sm text-slate-400"
      >
        ＋ Add a favorite by name
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {d.loading && <Centered>Looking for places…</Centered>}
        {!d.loading && d.fetchError && (
          <Centered>
            <p className="text-slate-300">Couldn’t load places.</p>
            <p className="text-sm">{d.fetchError}</p>
          </Centered>
        )}
        {!d.loading && !d.fetchError && shown.length === 0 && (
          <Centered>Nothing go-able right now. Try a later arrival.</Centered>
        )}
        {!d.loading && !d.fetchError && shown.length > 0 && (
          <ul className="flex flex-col gap-2">
            {shown.map((item) => (
              <PlaceCard
                key={item.place.id}
                item={item}
                annotation={d.annotations[item.place.id]}
                isFavorite={d.favoriteIds.has(item.place.id)}
                nowMs={d.nowMs}
                onSelect={(i) => navigate(`/place/${i.place.id}`)}
              />
            ))}
          </ul>
        )}
      </div>

      {!d.loading && !d.fetchError && shown.length > 0 && (
        <button
          type="button"
          onClick={() => navigate('/roulette')}
          className="shrink-0 rounded-full bg-slate-100 py-3 text-center font-medium text-slate-900"
        >
          🎲 Spin
        </button>
      )}
    </div>
  )
}
