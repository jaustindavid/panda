import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { auth, db } from './firebase.ts'

const COLLECTION = 'nogos'
// No-go and favorite are mutually exclusive: blocking clears any save. Keep in
// sync with favorites.ts.
const SAVED_COLLECTION = 'savedPlaces'

/** Blocked Place IDs (circle-shared). Hard-excludes from discovery +
 *  roulette (PRD §7 F7). Our own data — just a Place-ID flag. */
export async function loadNoGoIds(): Promise<Set<string>> {
  const snap = await getDocs(collection(db, COLLECTION))
  return new Set(snap.docs.map((d) => d.id))
}

/** Block a place for the circle. Atomically clears any favorite on the same
 *  place — the two lists are mutually exclusive. */
export async function addNoGo(placeId: string): Promise<void> {
  const user = auth.currentUser
  if (user == null) throw new Error('Not signed in')
  const batch = writeBatch(db)
  batch.set(doc(db, COLLECTION, placeId), {
    blockedByUid: user.uid,
    blockedAt: serverTimestamp(),
  })
  batch.delete(doc(db, SAVED_COLLECTION, placeId))
  await batch.commit()
}

export async function removeNoGo(placeId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, placeId))
}
