import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useGeolocation } from '../hooks/useGeolocation.ts'
import { searchNearbyRestaurants } from '../lib/places.ts'
import type { Place } from '../lib/places.ts'
import { availableGenres, rankDiscovery } from '../lib/discovery.ts'
import { buildAnnotations } from '../lib/annotations.ts'
import type { PlaceAnnotation } from '../lib/annotations.ts'
import { loadOverrideMap } from '../lib/overrides.ts'
import { listAllNotes } from '../lib/notes.ts'
import { listVisits } from '../lib/visits.ts'
import { loadNoGoIds } from '../lib/nogo.ts'
import { loadFavorites } from '../lib/favorites.ts'
import { DiscoveryContext } from './discovery-context.ts'
import type { DiscoveryData } from './discovery-context.ts'

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

/** Holds discovery data for the whole signed-in session (above the routes),
 *  so list ⇄ detail ⇄ visits navigation never re-runs the Nearby Search. */
export function DiscoveryProvider({ children }: { children: ReactNode }) {
  const geo = useGeolocation()
  const [places, setPlaces] = useState<Place[] | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [offset, setOffset] = useState(15) // default +15 (PRD §3)
  const [genre, setGenre] = useState<string | null>(null)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const [annotations, setAnnotations] = useState<Record<string, PlaceAnnotation>>({})
  const [favoritePlaces, setFavoritePlaces] = useState<Place[]>([])
  const [nogoIds, setNogoIds] = useState<Set<string>>(new Set())
  const [circleRefresh, setCircleRefresh] = useState(0)

  // One Nearby Search per location fix (PRD §8); async-only setState.
  useEffect(() => {
    if (geo.status !== 'granted' || !geo.coords) return
    const center = geo.coords
    let cancelled = false
    searchNearbyRestaurants({ apiKey: MAPS_KEY, center })
      .then((res) => !cancelled && setPlaces(res))
      .catch(
        (e) => !cancelled && setFetchError(e instanceof Error ? e.message : String(e)),
      )
    return () => {
      cancelled = true
    }
  }, [geo.status, geo.coords])

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Circle's own data (cheap). Best-effort: a failure just unbadges cards.
  useEffect(() => {
    let cancelled = false
    Promise.all([
      loadOverrideMap(),
      listAllNotes(),
      listVisits(),
      loadNoGoIds(),
      loadFavorites(),
    ])
      .then(([ov, notes, visits, nogos, favs]) => {
        if (cancelled) return
        setOverrides(ov)
        setAnnotations(buildAnnotations(notes, visits))
        setNogoIds(nogos)
        setFavoritePlaces(favs)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [circleRefresh])

  const ranked = useMemo(() => {
    if (!geo.coords) return []
    // Merge nearby results with saved favorites (so far favorites still
    // appear), preferring fresh nearby data on overlap. Then go-able-rank,
    // then drop blocked (no-go) places.
    const byId = new Map<string, Place>()
    for (const fp of favoritePlaces) byId.set(fp.id, fp)
    for (const p of places ?? []) byId.set(p.id, p)
    const r = rankDiscovery({
      places: [...byId.values()],
      origin: geo.coords,
      nowMs,
      arrivalOffsetMin: offset,
      overrides,
    })
    return r.filter((d) => !nogoIds.has(d.place.id))
  }, [places, favoritePlaces, nogoIds, geo.coords, nowMs, offset, overrides])

  const favoriteIds = useMemo(
    () => new Set(favoritePlaces.map((p) => p.id)),
    [favoritePlaces],
  )

  const genres = useMemo(() => availableGenres(ranked), [ranked])
  const shown = useMemo(() => {
    let list = ranked
    if (favoritesOnly) list = list.filter((r) => favoriteIds.has(r.place.id))
    if (genre) list = list.filter((r) => r.genre === genre)
    return list
  }, [ranked, genre, favoritesOnly, favoriteIds])

  const value: DiscoveryData = {
    geoStatus: geo.status,
    geoMessage: geo.message,
    coords: geo.coords,
    retryGeo: geo.request,
    loading: geo.status === 'granted' && places === null && fetchError === null,
    fetchError,
    ranked,
    shown,
    genres,
    annotations,
    overrides,
    favoriteIds,
    nogoIds,
    offset,
    setOffset,
    genre,
    setGenre,
    favoritesOnly,
    setFavoritesOnly,
    nowMs,
    findRanked: (placeId) => ranked.find((d) => d.place.id === placeId),
    reloadCircleData: () => setCircleRefresh((r) => r + 1),
  }

  return <DiscoveryContext value={value}>{children}</DiscoveryContext>
}
