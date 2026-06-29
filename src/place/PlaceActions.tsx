import { useState } from 'react'
import { useDiscoveryData } from '../discovery/discovery-context.ts'
import type { Place } from '../lib/places.ts'
import { addFavorite, removeFavorite } from '../lib/favorites.ts'
import { addNoGo, removeNoGo } from '../lib/nogo.ts'

/** Save-as-favorite (★, PRD §7 F8) + never-show/no-go (🚫, F7) toggles.
 *  Both are circle-shared per-place flags any member can set. */
export function PlaceActions({
  place,
  onChanged,
}: {
  place: Place
  onChanged?: () => void
}) {
  const d = useDiscoveryData()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isFav = d.favoriteIds.has(place.id)
  const isBlocked = d.nogoIds.has(place.id)

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      d.reloadCircleData()
      onChanged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void run(() =>
              isFav ? removeFavorite(place.id) : addFavorite(place),
            )
          }
          className={`flex-1 rounded-full px-3 py-2 text-sm font-medium disabled:opacity-50 ${
            isFav
              ? 'bg-amber-400/20 text-amber-200'
              : 'bg-slate-800 text-slate-300'
          }`}
        >
          {isFav ? '★ Saved' : '☆ Save'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void run(() => (isBlocked ? removeNoGo(place.id) : addNoGo(place.id)))
          }
          className={`flex-1 rounded-full px-3 py-2 text-sm font-medium disabled:opacity-50 ${
            isBlocked
              ? 'bg-red-500/20 text-red-200'
              : 'bg-slate-800 text-slate-300'
          }`}
        >
          {isBlocked ? '🚫 Blocked' : 'Never show'}
        </button>
      </div>
      {error != null && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
