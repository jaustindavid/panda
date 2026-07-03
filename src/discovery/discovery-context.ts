import { createContext, use } from 'react'
import type { LatLng } from '../lib/distance.ts'
import type { DiscoveryPlace } from '../lib/discovery.ts'
import type { PlaceAnnotation } from '../lib/annotations.ts'
import type { GeoStatus } from '../hooks/useGeolocation.ts'
import type { BlockedBrand } from '../lib/blockedBrands.ts'

/** Discovery state shared across routes (list / detail / visits) so a single
 *  Nearby Search persists for the app session — back/forward never re-fetch. */
export interface DiscoveryData {
  geoStatus: GeoStatus
  geoMessage?: string
  coords?: LatLng
  retryGeo: () => void

  loading: boolean
  fetchError: string | null
  ranked: DiscoveryPlace[]
  /** ranked, after the active genre filter — what the list + roulette use. */
  shown: DiscoveryPlace[]
  genres: string[]
  annotations: Record<string, PlaceAnnotation>
  overrides: Record<string, number>
  /** Saved-favorite Place IDs (★ badge + detail toggle). */
  favoriteIds: Set<string>
  /** Blocked Place IDs (detail toggle; already excluded from ranked). */
  nogoIds: Set<string>
  /** Blocked chains/brands (e.g. "Walmart"); already excluded from ranked —
   *  add-by-name filters its own results against this too. */
  blockedBrands: BlockedBrand[]

  /** The "leave in" chip offset (minutes); setOffset also exits target mode. */
  offset: number
  setOffset: (minutes: number) => void
  /** "Meal at <time>" absolute arrival as minutes-since-midnight, or null for
   *  the relative chips. When set it overrides the chip + drive stops gating. */
  targetMinOfDay: number | null
  setTargetArrival: (minOfDay: number | null) => void
  genre: string | null
  setGenre: (genre: string | null) => void
  /** Restrict the list (and roulette) to saved favorites. */
  favoritesOnly: boolean
  setFavoritesOnly: (on: boolean) => void
  nowMs: number

  /** Center the current results are around (user GPS, or a "search this
   *  area" point). The map centers + compares against this. */
  searchCenter?: LatLng
  /** Re-run Nearby Search around a new center ("search this area"). A new
   *  billed call, user-triggered (PRD §8 / §11.2 Q10). */
  searchHere: (center: LatLng) => void

  /** Current Nearby Search radius, metres (widen-able). */
  searchRadius: number
  /** True while the radius can still be widened (below the max tier). */
  canWiden: boolean
  /** Widen the search to the next radius tier + re-run Nearby (billed). */
  widenSearch: () => void
  /** Re-search the active genre via Text Search, beyond the nearest-20
   *  (billed; no-op when no genre is selected or one is already in flight). */
  findMoreInGenre: () => void
  /** True while a genre-scoped re-search is in flight. */
  expanding: boolean
  /** Last genre-scoped re-search error, if any (shown inline). */
  expandError: string | null

  /** Find a ranked place by id (for the detail route, no re-fetch). */
  findRanked: (placeId: string) => DiscoveryPlace | undefined
  /** Re-pull overrides + annotations after a detail edits them. */
  reloadCircleData: () => void
}

export const DiscoveryContext = createContext<DiscoveryData | null>(null)

export function useDiscoveryData(): DiscoveryData {
  const ctx = use(DiscoveryContext)
  if (ctx == null) {
    throw new Error('useDiscoveryData must be used within a DiscoveryProvider')
  }
  return ctx
}
