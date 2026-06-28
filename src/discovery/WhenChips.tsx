const OPTIONS: ReadonlyArray<{ label: string; value: number }> = [
  { label: 'Now', value: 0 },
  { label: '+15', value: 15 },
  { label: '+30', value: 30 },
  { label: '+60', value: 60 },
]

interface WhenChipsProps {
  value: number
  onChange: (minutes: number) => void
  /** Resolved arrival clock for the active offset, e.g. "7:25". */
  arrivalLabel: string
}

/** The "when" control (PRD §9): chip row, not a slider. Default +15, a
 *  travel-time proxy. Tapping re-filters client-side — no new Maps call. */
export function WhenChips({ value, onChange, arrivalLabel }: WhenChipsProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2" role="group" aria-label="When are we going?">
        {OPTIONS.map((o) => {
          const active = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              className={`flex-1 rounded-full px-3 py-2 text-sm font-medium ${
                active
                  ? 'bg-slate-100 text-slate-900'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
      <p className="text-center text-xs text-slate-500">
        Arriving around {arrivalLabel}
      </p>
    </div>
  )
}
