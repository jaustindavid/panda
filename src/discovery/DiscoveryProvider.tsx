import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useGeolocation } from '../hooks/useGeolocation.ts'
import { searchNearbyRestaurants, searchTextRestaurants } from '../lib/places.ts'
import type { Place } from '../lib/places.ts'
import { computeDriveSeconds } from '../lib/travel.ts'
import { haversineMeters } from '../lib/distance.ts'
import type { LatLng } from '../lib/distance.ts'
import { availableGenres, MAX_DISTANCE_M, rankDiscovery } from '../lib/discovery.ts'
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

// "Search wider" radius tiers, metres. 5 km default; 50 km is the Nearby
// Search (New) max. Each step is a new billed Nearby call (PRD §8 / §11.2 Q10).
const RADIUS_TIERS = [5_000, 15_000, 50_000]

/** Minutes from `nowMs` (device-local) to the next occurrence of a
 *  minutes-since-midnight target — today if still ahead, else tomorrow. For
 *  the "meal at <time>" absolute-arrival control (PRD §11.2 Q9 follow-on). */
function minutesUntilTarget(targetMinOfDay: number, nowMs: number): number {
  const d = new Date(nowMs)
  const nowMin = d.getHours() * 60 + d.getMinutes()
  const diff = targetMinOfDay - nowMin
  return diff < 0 ? diff + 1440 : diff
}

/** Holds discovery data for the whole signed-in session (above the routes),
 *  so list ⇄ detail ⇄ visits navigation never re-runs the Nearby Search. */
export function DiscoveryProvider({ children }: { children: ReactNode }) {
  const geo = useGeolocation()
  const [places, setPlaces] = useState<Place[] | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [offset, setOffset] = useState(15) // default +15 (PRD §3)
  // "Meal at <time>": absolute target arrival as minutes-since-midnight, or
  // null for the relative chips. When set, it overrides the chip and drive
  // time stops gating (the clock time is the arrival).
  const [targetMinOfDay, setTargetMinOfDay] = useState<number | null>(null)
  const [genre, setGenre] = useState<string | null>(null)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const [annotations, setAnnotations] = useState<Record<string, PlaceAnnotation>>({})
  const [favoritePlaces, setFavoritePlaces] = useState<Place[]>([])
  const [nogoIds, setNogoIds] = useState<Set<string>>(new Set())
  const [circleRefresh, setCircleRefresh] = useState(0)
  // Override search center for "search this area"; falls back to user GPS.
  const [searchOverride, setSearchOverride] = useState<LatLng | null>(null)
  const searchCenter = searchOverride ?? geo.coords
  // "Search wider" radius (metres) — widening re-runs the Nearby Search.
  const [searchRadius, setSearchRadius] = useState(RADIUS_TIERS[0])
  // Extra candidates from a genre-scoped re-search (Text Search); merged into
  // the ranked set so a tapped genre can reach beyond the nearest-20.
  const [extraPlaces, setExtraPlaces] = useState<Place[]>([])
  const [expanding, setExpanding] = useState(false)
  const [expandError, setExpandError] = useState<string | null>(null)
  // placeId → drive seconds from the user (Routes matrix, §11.2 Q9). null =
  // routed, no path; absent = not yet routed. Best-effort: stays empty (filter
  // falls back to chip-only) until the Routes API is enabled.
  const [driveSecondsById, setDriveSecondsById] = useState<Record<string, number | null>>({})

  // One Nearby Search per (search center, radius) — a new billed call per
  // explicit recenter / widen (PRD §8 / §11.2 Q10).
  useEffect(() => {
    if (geo.status !== 'granted' || !searchCenter) return
    const center = searchCenter
    let cancelled = false
    searchNearbyRestaurants({ apiKey: MAPS_KEY, center, radiusMeters: searchRadius })
      .then((res) => {
        if (cancelled) return
        setPlaces(res)
        setFetchError(null) // clear any stale error from a prior search
      })
      .catch(
        (e) => !cancelled && setFetchError(e instanceof Error ? e.message : String(e)),
      )
    return () => {
      cancelled = true
    }
  }, [geo.status, searchCenter, searchRadius])

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

  // Drive times for the candidate places — one Compute Route Matrix call per
  // batch of up to 25 not-yet-routed places, from the user's GPS. Cached per
  // session by placeId. Best-effort: on error (e.g. Routes API not enabled) it
  // stays empty and the go-able filter falls back to chip-only arrival; the
  // next search retries (PRD §8 / §11.2 Q9).
  useEffect(() => {
    const origin = geo.coords
    if (!origin) return
    const seen = new Set<string>()
    const missing: { id: string; location: LatLng }[] = []
    for (const p of [...favoritePlaces, ...extraPlaces, ...(places ?? [])]) {
      if (driveSecondsById[p.id] !== undefined || seen.has(p.id)) continue
      // Skip places past the distance cap — they're dropped from ranked
      // anyway, so don't spend a Route Matrix element on them.
      if (haversineMeters(origin, p.location) > MAX_DISTANCE_M) continue
      seen.add(p.id)
      missing.push({ id: p.id, location: p.location })
      if (missing.length >= 25) break
    }
    if (missing.length === 0) return
    let cancelled = false
    computeDriveSeconds(origin, missing, MAPS_KEY)
      .then((secs) => {
        if (cancelled) return
        setDriveSecondsById((prev) => {
          const next = { ...prev }
          for (const m of missing) next[m.id] = secs[m.id] ?? null
          return next
        })
      })
      .catch(() => undefined) // degrade silently; the next search retries
    return () => {
      cancelled = true
    }
  }, [places, favoritePlaces, extraPlaces, geo.coords, driveSecondsById])

  const ranked = useMemo(() => {
    if (!geo.coords) return []
    // Merge the candidate set: saved favorites (so far favorites still
    // appear) + genre-scoped extras + nearby results, with fresh nearby data
    // preferred on overlap. Then go-able-rank, then drop blocked (no-go).
    const byId = new Map<string, Place>()
    for (const fp of favoritePlaces) byId.set(fp.id, fp)
    for (const ep of extraPlaces) byId.set(ep.id, ep)
    for (const p of places ?? []) byId.set(p.id, p)
    // "Meal at <time>" overrides the chip: arrival = the target clock, and
    // drive stops gating (you'll leave in time). Else relative chip + drive.
    const inTarget = targetMinOfDay != null
    const r = rankDiscovery({
      places: [...byId.values()],
      origin: geo.coords,
      nowMs,
      arrivalOffsetMin: inTarget ? minutesUntilTarget(targetMinOfDay, nowMs) : offset,
      includeDriveInArrival: !inTarget,
      overrides,
      travelSecondsById: driveSecondsById,
    })
    return r.filter((d) => !nogoIds.has(d.place.id))
  }, [
    places,
    favoritePlaces,
    extraPlaces,
    nogoIds,
    geo.coords,
    nowMs,
    offset,
    targetMinOfDay,
    overrides,
    driveSecondsById,
  ])

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

  const canWiden = searchRadius < RADIUS_TIERS[RADIUS_TIERS.length - 1]
  // Widen the Nearby Search to the next radius tier; the effect re-fetches.
  const widenSearch = () =>
    setSearchRadius((r) => RADIUS_TIERS.find((t) => t > r) ?? r)

  // Genre-scoped re-search: a Text Search for the active genre near the
  // current center, merged into the candidate set so the genre filter reaches
  // beyond the fetched nearest-20 (one billed call per tap, PRD §11.2 Q10).
  const findMoreInGenre = () => {
    if (!genre || !searchCenter || expanding) return
    setExpanding(true)
    setExpandError(null)
    searchTextRestaurants(genre, MAPS_KEY, searchCenter, 20)
      .then((res) =>
        setExtraPlaces((prev) => {
          const byId = new Map(prev.map((p) => [p.id, p]))
          for (const p of res) byId.set(p.id, p)
          return [...byId.values()]
        }),
      )
      .catch((e) => setExpandError(e instanceof Error ? e.message : String(e)))
      .finally(() => setExpanding(false))
  }

  // Selecting a relative chip exits "meal at <time>" mode.
  const chooseOffset = (min: number) => {
    setOffset(min)
    setTargetMinOfDay(null)
  }

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
    setOffset: chooseOffset,
    targetMinOfDay,
    setTargetArrival: setTargetMinOfDay,
    genre,
    setGenre,
    favoritesOnly,
    setFavoritesOnly,
    nowMs,
    searchCenter,
    searchHere: (center) => setSearchOverride(center),
    searchRadius,
    canWiden,
    widenSearch,
    findMoreInGenre,
    expanding,
    expandError,
    findRanked: (placeId) => ranked.find((d) => d.place.id === placeId),
    reloadCircleData: () => setCircleRefresh((r) => r + 1),
  }

  return <DiscoveryContext value={value}>{children}</DiscoveryContext>
}
