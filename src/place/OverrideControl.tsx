import { useEffect, useState } from 'react'
import { clearOverride, getOverride, setOverride } from '../lib/overrides.ts'

const PRESETS: ReadonlyArray<{ label: string; value: number }> = [
  { label: 'To close', value: 0 },
  { label: '30m early', value: 30 },
  { label: '60m early', value: 60 },
  { label: '120m early', value: 120 },
]

/** Good-time-to-go override (PRD §7 F4b). Any member sets how many minutes
 *  before posted close the kitchen really stops seating; feeds the go-able
 *  filter for the whole circle. `onChanged` lets discovery re-pull. */
export function OverrideControl({
  placeId,
  onChanged,
}: {
  placeId: string
  onChanged?: () => void
}) {
  const [buffer, setBuffer] = useState(0)
  const [note, setNote] = useState('')
  const [exists, setExists] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getOverride(placeId)
      .then((o) => {
        if (cancelled || o == null) return
        setBuffer(o.closeBufferMin)
        setNote(o.note)
        setExists(true)
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      cancelled = true
    }
  }, [placeId])

  async function save() {
    setBusy(true)
    try {
      await setOverride(placeId, buffer, note.trim())
      setExists(true)
      onChanged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function clear() {
    setBusy(true)
    try {
      await clearOverride(placeId)
      setBuffer(0)
      setNote('')
      setExists(false)
      onChanged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Good time to go
      </h2>
      <p className="text-xs text-slate-500">
        When does the kitchen really stop seating?
      </p>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            aria-pressed={buffer === p.value}
            onClick={() => setBuffer(p.value)}
            className={`rounded-full px-3 py-1.5 text-sm ${
              buffer === p.value
                ? 'bg-slate-100 text-slate-900'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note (e.g. bar stays open later)"
        className="rounded-xl bg-slate-900 px-3 py-2 text-sm outline-none placeholder:text-slate-600"
      />
      <div className="flex gap-3 text-sm">
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="rounded-full bg-slate-100 px-4 py-1.5 font-medium text-slate-900 disabled:opacity-50"
        >
          Save
        </button>
        {exists && (
          <button
            type="button"
            onClick={() => void clear()}
            disabled={busy}
            className="text-slate-400"
          >
            Clear
          </button>
        )}
      </div>
      {error != null && <p className="text-sm text-red-400">{error}</p>}
    </section>
  )
}
