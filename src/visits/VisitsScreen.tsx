import { useEffect, useState } from 'react'
import { listVisits } from '../lib/visits.ts'
import type { Visit } from '../lib/visits.ts'
import { getPlaceName } from '../lib/places.ts'
import { formatRelative } from '../lib/time.ts'

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

/** Recent visits across the circle (PRD §7 F5): who + place + when. Place
 *  names are re-hydrated from Place IDs on demand (owner's ToS-clean choice,
 *  §11.2 Q3a) — deduped + session-cached to spare the GetPlaceRequest cap. */
export function VisitsScreen() {
  const [visits, setVisits] = useState<Visit[] | null>(null)
  const [names, setNames] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [nowMs] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false
    listVisits()
      .then(async (vs) => {
        if (cancelled) return
        setVisits(vs)
        const ids = [...new Set(vs.map((v) => v.placeId))]
        const entries = await Promise.all(
          ids.map(async (id) => [id, await getPlaceName(id, MAPS_KEY)] as const),
        )
        if (!cancelled) setNames(Object.fromEntries(entries))
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      cancelled = true
    }
  }, [])

  if (error != null) {
    return <p className="p-4 text-sm text-red-400">{error}</p>
  }
  if (visits == null) {
    return <p className="p-4 text-sm text-slate-500">Loading visits…</p>
  }
  if (visits.length === 0) {
    return (
      <p className="p-4 text-sm text-slate-500">
        No visits yet. Tap “I'm here” on a place to log one.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {visits.map((v) => (
        <li key={v.id} className="rounded-xl bg-slate-900 px-4 py-3">
          <p className="text-sm">
            <span className="font-medium">{v.byName}</span>
            <span className="text-slate-400"> · {names[v.placeId] ?? '…'}</span>
          </p>
          {v.at != null && (
            <p className="text-xs text-slate-500">{formatRelative(v.at, nowMs)}</p>
          )}
        </li>
      ))}
    </ul>
  )
}
