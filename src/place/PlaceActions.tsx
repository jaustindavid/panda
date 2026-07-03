import { useState } from 'react'
import { useDiscoveryData } from '../discovery/discovery-context.ts'
import type { Place } from '../lib/places.ts'
import { addFavorite, removeFavorite } from '../lib/favorites.ts'
import { addNoGo, removeNoGo } from '../lib/nogo.ts'
import {
  addBlockedBrand,
  matchingBlockedBrands,
  removeBlockedBrand,
} from '../lib/blockedBrands.ts'

/** Save-as-favorite (★, PRD §7 F8) + never-show/no-go (🚫, F7) toggles, plus a
 *  "block this chain" quick action (🚫 by name, PRD §11.2 Q11 follow-on) for
 *  places you'll never want recommended anywhere (Walmart, Starbucks, …). If a
 *  chain block already covers this place, show which + let it be undone right
 *  here — reachable via add-by-name search, which never filters blocks (the
 *  fix for the "black hole": a chain-blocked place must stay findable by name
 *  to look at or unblock). Favorite/no-go are circle-shared and **mutually
 *  exclusive** — saving clears a block and vice versa (enforced atomically in
 *  the lib; the post-action reloadCircleData refreshes all three). */
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
  const [blockingChain, setBlockingChain] = useState(false)
  const [chainName, setChainName] = useState(place.name)

  const isFav = d.favoriteIds.has(place.id)
  const isBlocked = d.nogoIds.has(place.id)
  const chainMatches = matchingBlockedBrands(place.name, d.blockedBrands)

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

  async function handleBlockChain() {
    const name = chainName.trim()
    if (name === '') return
    await run(() => addBlockedBrand(name))
    setBlockingChain(false)
  }

  return (
    <div className="flex flex-col gap-2">
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
          {isFav ? '★ Favorited' : '☆ Favorite'}
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

      {chainMatches.length > 0 ? (
        <div className="flex flex-col gap-1">
          {chainMatches.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">🚫 Blocked chain: {b.name}</p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(() => removeBlockedBrand(b.id))}
                className="shrink-0 text-xs text-slate-400 disabled:opacity-50"
              >
                Unblock
              </button>
            </div>
          ))}
        </div>
      ) : blockingChain ? (
        <div className="flex gap-2">
          <input
            value={chainName}
            onChange={(e) => setChainName(e.target.value)}
            placeholder="Chain name…"
            className="min-w-0 flex-1 rounded-full bg-slate-900 px-3 py-1.5 text-sm outline-none placeholder:text-slate-600"
          />
          <button
            type="button"
            disabled={busy || chainName.trim() === ''}
            onClick={() => void handleBlockChain()}
            className="shrink-0 rounded-full bg-rose-500/20 px-3 py-1.5 text-sm font-medium text-rose-200 disabled:opacity-50"
          >
            Block
          </button>
          <button
            type="button"
            onClick={() => setBlockingChain(false)}
            className="shrink-0 text-sm text-slate-400"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setChainName(place.name)
            setBlockingChain(true)
          }}
          className="self-start text-xs text-slate-500"
        >
          🚫 Block this chain
        </button>
      )}

      {error != null && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
