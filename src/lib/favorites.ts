import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { auth, db } from './firebase.ts'
import type { Place } from './places.ts'
import type { OpeningPeriod } from './goable.ts'

const COLLECTION = 'savedPlaces'
// Favorite and no-go are mutually exclusive (a place is "always include" XOR
// "always exclude"): saving clears any block. Keep in sync with nogo.ts.
const NOGO_COLLECTION = 'nogos'

// A favorite stores a Place snapshot (name + hours + location) — the accepted
// favorites-only caching step-over (PRD §11.2 Q3c). Renders + go-ability
// without a per-load Maps call; a far "not close" favorite still joins
// discovery/roulette regardless of proximity, up to the 100 km distance cap
// (MAX_DISTANCE_M in discovery.ts; PRD §7 F1/F8).
interface SavedPlaceDoc {
  name: string
  formattedAddress?: string | null
  location: { latitude: number; longitude: number }
  primaryType?: string | null
  types?: string[]
  utcOffsetMinutes?: number
  periods?: OpeningPeriod[] | null
  kitchenPeriods?: OpeningPeriod[] | null
  addedByUid?: string
}

function fromDoc(id: string, data: SavedPlaceDoc): Place {
  return {
    id,
    name: data.name,
    formattedAddress: data.formattedAddress ?? undefined,
    location: data.location,
    primaryType: data.primaryType ?? undefined,
    types: data.types ?? [],
    utcOffsetMinutes: data.utcOffsetMinutes ?? 0,
    periods: data.periods ?? undefined,
    kitchenPeriods: data.kitchenPeriods ?? undefined,
  }
}

/** All saved favorites as Place snapshots (re-hydrated from Firestore). */
export async function loadFavorites(): Promise<Place[]> {
  const snap = await getDocs(collection(db, COLLECTION))
  return snap.docs.map((d) => fromDoc(d.id, d.data() as SavedPlaceDoc))
}

/** Save a place as a circle favorite (snapshots its name + hours). Atomically
 *  clears any no-go on the same place — the two lists are mutually exclusive. */
export async function addFavorite(place: Place): Promise<void> {
  const user = auth.currentUser
  if (user == null) throw new Error('Not signed in')
  const batch = writeBatch(db)
  batch.set(doc(db, COLLECTION, place.id), {
    name: place.name,
    formattedAddress: place.formattedAddress ?? null,
    location: place.location,
    primaryType: place.primaryType ?? null,
    types: place.types,
    utcOffsetMinutes: place.utcOffsetMinutes,
    periods: place.periods ?? null,
    kitchenPeriods: place.kitchenPeriods ?? null,
    addedByUid: user.uid,
    addedAt: serverTimestamp(),
    snapshotAt: serverTimestamp(),
  })
  batch.delete(doc(db, NOGO_COLLECTION, place.id))
  await batch.commit()
}

export async function removeFavorite(placeId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, placeId))
}
