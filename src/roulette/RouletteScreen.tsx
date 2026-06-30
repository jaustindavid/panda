import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDiscoveryData } from '../discovery/discovery-context.ts'
import type { DiscoveryPlace } from '../lib/discovery.ts'
import { formatDistance } from '../lib/distance.ts'

/** Roulette (PRD §7 F2): a plain uniform-random pick over the current go-able
 *  + genre-filtered set (no weighting, §11.2 Q5), with a light spin. Accept →
 *  the place detail; respin → another pick. A route, so back dismisses it. */
export function RouletteScreen() {
  const d = useDiscoveryData()
  const navigate = useNavigate()
  // Go-able set only (PRD §7 F2) — 🟢 green + 🟡 yellow; never a maybe-closed
  // (hours-unknown) place.
  const candidates = d.shown.filter(
    (s) => s.status === 'green' || s.status === 'yellow',
  )
  const [pick, setPick] = useState<DiscoveryPlace | null>(null)
  const [displayIdx, setDisplayIdx] = useState(0)
  const [nonce, setNonce] = useState(0)

  // Read candidates via a ref so the spin effect re-runs only on respin or
  // when results first become available — not every 60s when the go-able
  // list refreshes (which would re-spin spuriously).
  const candidatesRef = useRef(candidates)
  useEffect(() => {
    candidatesRef.current = candidates
  }, [candidates])

  const hasCandidates = candidates.length > 0

  // Spin: cycle a highlight, then settle on a random pick. State changes come
  // from the interval/timeout callbacks, so the effect body stays pure.
  useEffect(() => {
    if (!hasCandidates) return
    let i = 0
    const interval = setInterval(() => {
      i += 1
      const n = candidatesRef.current.length
      if (n > 0) setDisplayIdx(i % n)
    }, 80)
    const timeout = setTimeout(() => {
      clearInterval(interval)
      const cs = candidatesRef.current
      setPick(cs[Math.floor(Math.random() * cs.length)])
    }, 900)
    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [nonce, hasCandidates])

  const spinning = pick === null && hasCandidates

  return (
    <div className="flex h-full flex-col gap-4">
      <h1 className="sr-only">Roulette</h1>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="self-start text-sm text-slate-400"
      >
        ← Back
      </button>

      {candidates.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-slate-400">
          Nothing go-able to spin. Loosen the filter or try a later arrival.
        </div>
      ) : spinning ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm uppercase tracking-wide text-slate-500">
            Spinning…
          </p>
          <p className="text-2xl font-semibold text-slate-300">
            {candidates[displayIdx]?.place.name}
          </p>
        </div>
      ) : (
        pick != null && (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-500">
                Go here
              </p>
              <p className="mt-1 text-3xl font-bold">{pick.place.name}</p>
              <p className="mt-1 text-slate-400">
                {pick.genre} · {formatDistance(pick.distanceMeters)}
                {pick.status === 'yellow' && ' · cutting it close'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate(`/place/${pick.place.id}`)}
                className="rounded-full bg-emerald-500/20 px-6 py-3 font-medium text-emerald-200"
              >
                Let's go
              </button>
              <button
                type="button"
                onClick={() => {
                  setPick(null)
                  setNonce((n) => n + 1)
                }}
                className="rounded-full border border-slate-700 px-6 py-3 font-medium text-slate-200"
              >
                Respin
              </button>
            </div>
          </div>
        )
      )}
    </div>
  )
}
