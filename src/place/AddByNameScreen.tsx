import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDiscoveryData } from '../discovery/discovery-context.ts'
import { searchTextRestaurants } from '../lib/places.ts'
import type { Place } from '../lib/places.ts'
import { genreLabel } from '../lib/genre.ts'
import { addFavorite, removeFavorite } from '../lib/favorites.ts'
import { isBlockedBrand } from '../lib/blockedBrands.ts'

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

/** Add a favorite by name (PRD §7 F8): Text Search → save its snapshot. The
 *  point is "not close" favorites, so the search is location-biased, not
 *  restricted. */
export function AddByNameScreen() {
  const d = useDiscoveryData()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function search(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (q === '' || busy) return
    setBusy(true)
    setError(null)
    try {
      const found = await searchTextRestaurants(q, MAPS_KEY, d.coords)
      // Never surface a blocked chain — you already said you'll never want it
      // recommended, so don't offer it to favorite either (PRD §11.2 Q11).
      setResults(found.filter((p) => !isBlockedBrand(p.name, d.blockedBrands)))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function toggle(place: Place) {
    try {
      if (d.favoriteIds.has(place.id)) await removeFavorite(place.id)
      else await addFavorite(place)
      d.reloadCircleData()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="self-start text-sm text-slate-400"
      >
        ← Back
      </button>
      <h1 className="text-lg font-semibold">Add a favorite</h1>

      <form onSubmit={search} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a restaurant by name…"
          className="min-w-0 flex-1 rounded-full bg-slate-900 px-4 py-2 text-sm outline-none placeholder:text-slate-600"
        />
        <button
          type="submit"
          disabled={busy || query.trim() === ''}
          className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 disabled:opacity-50"
        >
          Search
        </button>
      </form>

      {error != null && <p className="text-sm text-red-400">{error}</p>}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {busy && <p className="text-sm text-slate-500">Searching…</p>}
        {!busy && results != null && results.length === 0 && (
          <p className="text-sm text-slate-500">No matches.</p>
        )}
        <ul className="flex flex-col gap-2">
          {results?.map((place) => {
            const saved = d.favoriteIds.has(place.id)
            return (
              <li
                key={place.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-slate-900"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/place/${place.id}`)}
                  className="min-w-0 flex-1 px-4 py-3 text-left"
                >
                  <span className="block truncate font-medium">{place.name}</span>
                  <span className="block truncate text-sm text-slate-400">
                    {genreLabel(place)}
                    {place.formattedAddress != null &&
                      ` · ${place.formattedAddress}`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void toggle(place)}
                  className={`mr-3 shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
                    saved
                      ? 'bg-amber-400/20 text-amber-200'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {saved ? '★ Favorited' : '☆ Favorite'}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
