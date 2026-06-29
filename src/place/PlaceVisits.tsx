import { useEffect, useState } from 'react'
import { useAuth } from '../auth/auth-context.ts'
import { deleteVisit, listVisitsForPlace, logVisit } from '../lib/visits.ts'
import type { Visit } from '../lib/visits.ts'
import { formatRelative } from '../lib/time.ts'

/** "Here now" logging + this place's visit history (PRD §7 F3). `onChanged`
 *  lets discovery refresh its last-visit annotation. */
export function PlaceVisits({
  placeId,
  onChanged,
}: {
  placeId: string
  onChanged?: () => void
}) {
  const { user } = useAuth()
  const [visits, setVisits] = useState<Visit[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nowMs] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false
    listVisitsForPlace(placeId)
      .then((v) => !cancelled && setVisits(v))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      cancelled = true
    }
  }, [placeId])

  async function here() {
    setBusy(true)
    try {
      await logVisit(placeId)
      setVisits(await listVisitsForPlace(placeId))
      onChanged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    setBusy(true)
    try {
      await deleteVisit(id)
      setVisits(await listVisitsForPlace(placeId))
      onChanged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Visits
        </h2>
        <button
          type="button"
          onClick={() => void here()}
          disabled={busy}
          className="rounded-full bg-emerald-500/20 px-4 py-1.5 text-sm font-medium text-emerald-200 disabled:opacity-50"
        >
          📍 I'm here
        </button>
      </div>

      {error != null && <p className="text-sm text-red-400">{error}</p>}
      {visits != null && visits.length === 0 && (
        <p className="text-sm text-slate-500">No visits logged yet.</p>
      )}

      <ul className="flex flex-col gap-1">
        {visits?.map((v) => (
          <li
            key={v.id}
            className="flex items-center gap-2 text-sm text-slate-300"
          >
            <span>{v.byName}</span>
            {v.at != null && (
              <span className="text-slate-500">· {formatRelative(v.at, nowMs)}</span>
            )}
            {v.byUid === user?.uid && (
              <button
                type="button"
                onClick={() => void remove(v.id)}
                className="ml-auto text-xs text-slate-500"
              >
                Delete
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
