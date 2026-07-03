import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDiscoveryData } from '../discovery/discovery-context.ts'
import { addBlockedBrand, removeBlockedBrand } from '../lib/blockedBrands.ts'

/** Manage blocked chains (PRD §11.2 Q11 follow-on, owner FR): a name-based
 *  block ("Walmart", "Starbucks") applied everywhere — the Places API has no
 *  chain/brand ID to filter on instead. List + add/remove; `blockedBrands`
 *  lives in DiscoveryProvider, so changes here reload via reloadCircleData. */
export function BlockedBrandsScreen() {
  const d = useDiscoveryData()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    const name = query.trim()
    if (name === '' || busy) return
    setBusy(true)
    setError(null)
    try {
      await addBlockedBrand(name)
      setQuery('')
      d.reloadCircleData()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove(id: string) {
    setBusy(true)
    setError(null)
    try {
      await removeBlockedBrand(id)
      d.reloadCircleData()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
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
      <h1 className="text-lg font-semibold">Blocked chains</h1>
      <p className="text-sm text-slate-400">
        Never recommend a chain anywhere — matched by name (e.g. “Walmart”
        also catches “Walmart Bakery”).
      </p>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chain name…"
          className="min-w-0 flex-1 rounded-full bg-slate-900 px-4 py-2 text-sm outline-none placeholder:text-slate-600"
        />
        <button
          type="submit"
          disabled={busy || query.trim() === ''}
          className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 disabled:opacity-50"
        >
          Block
        </button>
      </form>

      {error != null && <p className="text-sm text-red-400">{error}</p>}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {d.blockedBrands.length === 0 ? (
          <p className="text-sm text-slate-500">No blocked chains yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {d.blockedBrands.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-slate-900 px-4 py-3"
              >
                <span className="truncate font-medium">{b.name}</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleRemove(b.id)}
                  className="shrink-0 text-sm text-slate-400 disabled:opacity-50"
                >
                  Unblock
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
