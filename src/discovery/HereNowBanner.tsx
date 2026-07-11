import { useEffect, useRef, useState } from 'react'
import { useDiscoveryData } from './discovery-context.ts'
import { logVisit } from '../lib/visits.ts'
import { formatDistance } from '../lib/distance.ts'

/** "I'm here" home-screen shortcut (owner FR 2026-07-10): when GPS puts us
 *  right on top of an already-fetched place, skip the find-it-in-the-list
 *  dance entirely — one tap logs the visit. DiscoveryProvider's distance gate
 *  (~150m) decides whether this renders at all; ignores go-able status by
 *  design (you're physically there regardless of what Maps hours say). */
export function HereNowBanner() {
  const d = useDiscoveryData()
  const suggestion = d.hereNowSuggestion
  const [status, setStatus] = useState<'idle' | 'logging' | 'logged'>('idle')
  const [error, setError] = useState<string | null>(null)

  // Ref so the auto-dismiss timeout isn't rescheduled by unrelated provider
  // re-renders (dismissHereNow is a fresh closure each render).
  const dismissRef = useRef(d.dismissHereNow)
  useEffect(() => {
    dismissRef.current = d.dismissHereNow
  }, [d.dismissHereNow])

  const placeId = suggestion?.place.id
  useEffect(() => {
    if (status !== 'logged' || placeId == null) return
    const id = setTimeout(() => dismissRef.current(placeId), 1500)
    return () => clearTimeout(id)
  }, [status, placeId])

  if (suggestion == null) return null
  const { place, distanceMeters } = suggestion

  async function handleHere() {
    setStatus('logging')
    setError(null)
    try {
      await logVisit(place.id)
      d.reloadCircleData()
      setStatus('logged')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('idle')
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-500/10 px-4 py-3">
      {status === 'logged' ? (
        <p className="text-sm font-medium text-emerald-200">
          ✓ Logged your visit to {place.name}
        </p>
      ) : (
        <>
          <div className="min-w-0">
            <p className="truncate text-sm text-slate-300">
              📍 You’re at <span className="font-semibold">{place.name}</span>{' '}
              <span className="text-slate-500">({formatDistance(distanceMeters)})</span>
            </p>
            {error != null && <p className="text-xs text-red-400">{error}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => void handleHere()}
              disabled={status === 'logging'}
              className="rounded-full bg-emerald-500/20 px-4 py-1.5 text-sm font-medium text-emerald-200 disabled:opacity-50"
            >
              I’m here
            </button>
            <button
              type="button"
              onClick={() => d.dismissHereNow(place.id)}
              className="text-xs text-slate-500"
            >
              Not here?
            </button>
          </div>
        </>
      )}
    </div>
  )
}
