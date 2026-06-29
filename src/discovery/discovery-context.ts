import { createContext, use } from 'react'
import type { LatLng } from '../lib/distance.ts'
import type { DiscoveryPlace } from '../lib/discovery.ts'
import type { PlaceAnnotation } from '../lib/annotations.ts'
import type { GeoStatus } from '../hooks/useGeolocation.ts'

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

  offset: number
  setOffset: (minutes: number) => void
  genre: string | null
  setGenre: (genre: string | null) => void
  nowMs: number

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
