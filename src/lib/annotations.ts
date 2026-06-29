/** Per-place circle annotations for discovery results (PRD §7 F1: "notes
 *  count + last visit if any"). Pure aggregation over the circle's own data. */
export interface PlaceAnnotation {
  noteCount: number
  lastVisitAt: number | null
  lastVisitBy: string | null
}

type NoteLike = { placeId: string }
type VisitLike = { placeId: string; at: number | null; byName: string }

export function buildAnnotations(
  notes: NoteLike[],
  visits: VisitLike[],
): Record<string, PlaceAnnotation> {
  const out: Record<string, PlaceAnnotation> = {}
  const get = (placeId: string): PlaceAnnotation =>
    (out[placeId] ??= { noteCount: 0, lastVisitAt: null, lastVisitBy: null })

  for (const n of notes) get(n.placeId).noteCount += 1

  for (const v of visits) {
    const a = get(v.placeId)
    if (v.at != null && (a.lastVisitAt == null || v.at > a.lastVisitAt)) {
      a.lastVisitAt = v.at
      a.lastVisitBy = v.byName
    }
  }
  return out
}
