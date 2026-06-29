import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { auth, db } from './firebase.ts'

const COLLECTION = 'nogos'

/** Blocked Place IDs (circle-shared). Hard-excludes from discovery +
 *  roulette (PRD §7 F7). Our own data — just a Place-ID flag. */
export async function loadNoGoIds(): Promise<Set<string>> {
  const snap = await getDocs(collection(db, COLLECTION))
  return new Set(snap.docs.map((d) => d.id))
}

export async function addNoGo(placeId: string): Promise<void> {
  const user = auth.currentUser
  if (user == null) throw new Error('Not signed in')
  await setDoc(doc(db, COLLECTION, placeId), {
    blockedByUid: user.uid,
    blockedAt: serverTimestamp(),
  })
}

export async function removeNoGo(placeId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, placeId))
}
