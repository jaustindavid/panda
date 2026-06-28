interface GenreFilterProps {
  genres: string[]
  selected: string | null
  onSelect: (genre: string | null) => void
}

/** Genre chips derived from the current result set (genre = Maps types only,
 *  PRD §1.2). "All" clears the filter. Hidden when there's nothing to filter. */
export function GenreFilter({ genres, selected, onSelect }: GenreFilterProps) {
  if (genres.length < 2) return null

  function chip(label: string, value: string | null, active: boolean) {
    return (
      <button
        key={label}
        type="button"
        aria-pressed={active}
        onClick={() => onSelect(value)}
        className={`shrink-0 rounded-full px-3 py-1 text-sm ${
          active ? 'bg-slate-100 text-slate-900' : 'bg-slate-800 text-slate-300'
        }`}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {chip('All', null, selected === null)}
      {genres.map((g) => chip(g, g, selected === g))}
    </div>
  )
}
