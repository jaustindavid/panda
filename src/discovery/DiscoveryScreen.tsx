import { useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDiscoveryData } from './discovery-context.ts'
import { formatClock } from '../lib/time.ts'
import { WhenChips } from './WhenChips.tsx'
import { GenreFilter } from './GenreFilter.tsx'
import { PlaceCard } from './PlaceCard.tsx'
import { DiscoveryMap } from './DiscoveryMap.tsx'

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-slate-400">
      {children}
    </div>
  )
}

/** Expand-search controls (PRD §11.2 Q10): widen the Nearby radius, and — when
 *  a genre is active — re-search that genre via Text Search to reach beyond the
 *  fetched nearest-20. Each is one user-triggered billed call (§8). Hidden in
 *  favorites-only view (neither affects the favorites filter). */
function ExpandControls() {
  const d = useDiscoveryData()
  if (d.favoritesOnly) return null
  const showGenreMore = d.genre != null
  if (!d.canWiden && !showGenreMore) return null

  return (
    <div className="flex flex-col items-center gap-2 px-4 py-5 text-sm">
      {d.expandError != null && (
        <p className="text-xs text-red-400">Couldn’t expand: {d.expandError}</p>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        {showGenreMore && (
          <button
            type="button"
            onClick={d.findMoreInGenre}
            disabled={d.expanding}
            className="rounded-full bg-slate-800 px-4 py-2 font-medium text-slate-200 disabled:opacity-60"
          >
            {d.expanding ? 'Searching…' : `Find more ${d.genre}`}
          </button>
        )}
        {d.canWiden && (
          <button
            type="button"
            onClick={d.widenSearch}
            className="rounded-full bg-slate-800 px-4 py-2 font-medium text-slate-200"
          >
            🔭 Search wider
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500">
        Searching within {Math.round(d.searchRadius / 1000)} km
      </p>
    </div>
  )
}

/** Discovery home (PRD §7 F1): when-chips (client-side re-filter) → genre
 *  filter → go-able list. Data lives in DiscoveryProvider so opening a detail
 *  and coming back never re-fetches. */
export function DiscoveryScreen() {
  const d = useDiscoveryData()
  const navigate = useNavigate()
  const [view, setView] = useState<'list' | 'map'>('list')

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
      <h1 className="sr-only">Find a place to eat</h1>
      <WhenChips value={d.offset} onChange={d.setOffset} arrivalLabel={arrivalLabel} />
      <GenreFilter genres={d.genres} selected={d.genre} onSelect={d.setGenre} />
      <div className="flex items-center gap-3 text-sm">
        {d.favoriteIds.size > 0 && (
          <button
            type="button"
            aria-pressed={d.favoritesOnly}
            onClick={() => d.setFavoritesOnly(!d.favoritesOnly)}
            className={`rounded-full px-3 py-1 font-medium ${
              d.favoritesOnly
                ? 'bg-amber-400/20 text-amber-200'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            ★ Favorites
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate('/add')}
          className="text-slate-400"
        >
          ＋ Add by name
        </button>
        <button
          type="button"
          onClick={() => setView(view === 'map' ? 'list' : 'map')}
          className="ml-auto rounded-full bg-slate-800 px-3 py-1 font-medium text-slate-300"
        >
          {view === 'map' ? '☰ List' : '🗺 Map'}
        </button>
      </div>

      {view === 'map' && d.coords != null ? (
        <DiscoveryMap
          origin={d.coords}
          searchCenter={d.searchCenter ?? d.coords}
          places={shown}
          onSelect={(id) => navigate(`/place/${id}`)}
          onSearchHere={d.searchHere}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {d.loading && <Centered>Looking for places…</Centered>}
          {!d.loading && d.fetchError && (
            <Centered>
              <p className="text-slate-300">Couldn’t load places.</p>
              <p className="text-sm">{d.fetchError}</p>
            </Centered>
          )}
          {!d.loading && !d.fetchError && shown.length === 0 && (
            <Centered>
              <p>
                {d.favoritesOnly
                  ? 'None of your favorites are go-able right now.'
                  : 'Nothing go-able right now. Try a later arrival.'}
              </p>
              <ExpandControls />
            </Centered>
          )}
          {!d.loading && !d.fetchError && shown.length > 0 && (
            <>
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
              <ExpandControls />
            </>
          )}
        </div>
      )}

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
