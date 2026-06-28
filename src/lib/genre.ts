// Genre = Maps place types only (PRD §1.2, no custom tags). We humanize the
// primary type into a short chip label, e.g. italian_restaurant → "Italian",
// hot_dog_stand → "Hot Dog Stand", plain restaurant → "Restaurant".

export function humanizeType(type: string): string {
  const cleaned = type
    .replace(/_/g, ' ')
    .replace(/\brestaurant\b/g, '')
    .trim()
  const base = cleaned === '' ? 'restaurant' : cleaned
  return base
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')
}

/** A readable genre for a place, from its primary type (falling back to the
 *  first *_restaurant in types[], then a generic label). */
export function genreLabel(place: {
  primaryType?: string
  types: string[]
}): string {
  const raw =
    place.primaryType ??
    place.types.find((t) => t.endsWith('_restaurant')) ??
    'restaurant'
  return humanizeType(raw)
}
