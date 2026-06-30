const OPTIONS: ReadonlyArray<{ label: string; value: number }> = [
  { label: 'Now', value: 0 },
  { label: '+15', value: 15 },
  { label: '+30', value: 30 },
  { label: '+60', value: 60 },
]

interface WhenChipsProps {
  value: number
  onChange: (minutes: number) => void
  /** Absolute "meal at <time>" target (minutes-since-midnight), or null. */
  targetMinOfDay: number | null
  onSetTarget: (minOfDay: number | null) => void
  /** Resolved caption: "Leaving around 7:25" or "Arriving around 7:30". */
  caption: string
}

/** Minutes-since-midnight → the "HH:MM" a native time input wants. */
function toInputValue(min: number | null): string {
  if (min == null) return ''
  const h = Math.floor(min / 60)
    .toString()
    .padStart(2, '0')
  const m = (min % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

/** The "when" control (PRD §9): chip row of "leave in…" offsets, plus an
 *  "Arrive at" target time ("dinner at 7:30") that overrides the chips — drive
 *  time then stops gating, the clock time is the arrival (PRD §11.2 Q9). */
export function WhenChips({
  value,
  onChange,
  targetMinOfDay,
  onSetTarget,
  caption,
}: WhenChipsProps) {
  const inTarget = targetMinOfDay != null
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2" role="group" aria-label="When are we going?">
        {OPTIONS.map((o) => {
          const active = !inTarget && o.value === value
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              className={`flex-1 rounded-full px-3 py-2 text-sm font-medium ${
                active ? 'bg-slate-100 text-slate-900' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
      <div className="flex items-center justify-center gap-2 text-sm">
        <label className="flex items-center gap-1.5 text-slate-400">
          🕖 Arrive at
          <input
            type="time"
            value={toInputValue(targetMinOfDay)}
            onChange={(e) => {
              const v = e.target.value
              if (!v) {
                onSetTarget(null)
                return
              }
              const [h, m] = v.split(':').map(Number)
              onSetTarget(h * 60 + m)
            }}
            aria-label="Arrive at a specific time"
            className={`rounded-md px-2 py-1 [color-scheme:dark] ${
              inTarget ? 'bg-slate-100 text-slate-900' : 'bg-slate-800 text-slate-200'
            }`}
          />
        </label>
        {inTarget && (
          <button
            type="button"
            onClick={() => onSetTarget(null)}
            aria-label="Clear arrival time"
            className="rounded-full px-1 text-slate-500"
          >
            ✕
          </button>
        )}
      </div>
      <p className="text-center text-xs text-slate-500">{caption}</p>
    </div>
  )
}
