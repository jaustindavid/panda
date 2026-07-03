import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { auth, db } from './firebase.ts'

const COLLECTION = 'blockedBrands'
// Blocking a chain clears any favorite under it too (owner: "we'll never want
// this recommended" — same mutual-exclusion instinct as favorite/no-go).
const SAVED_COLLECTION = 'savedPlaces'

export interface BlockedBrand {
  /** Normalized key (lowercased, trimmed name) — also the doc id, so
   *  re-blocking the same name (any casing) overwrites rather than dupes. */
  id: string
  /** As typed, for display. */
  name: string
}

function slug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** All blocked chains (circle-shared). */
export async function loadBlockedBrands(): Promise<BlockedBrand[]> {
  const snap = await getDocs(collection(db, COLLECTION))
  return snap.docs.map((d) => ({
    id: d.id,
    name: (d.data().name as string | undefined) ?? d.id,
  }))
}

/**
 * Block a chain by name (PRD §11.2 Q11 follow-on — owner FR: "never
 * recommend Walmart/Starbucks"). Matched as a case-insensitive substring
 * against place names everywhere (discovery, roulette, add-by-name) — no
 * chain/brand ID exists in the Places API, and this also catches Google's own
 * sub-places (e.g. a literal "Walmart Bakery" Place) that a category filter
 * can't. Atomically clears any existing favorite whose name matches, in the
 * same write.
 */
export async function addBlockedBrand(name: string): Promise<void> {
  const user = auth.currentUser
  if (user == null) throw new Error('Not signed in')
  const trimmed = name.trim()
  if (trimmed === '') throw new Error('Chain name is empty')
  const needle = trimmed.toLowerCase()

  const favSnap = await getDocs(collection(db, SAVED_COLLECTION))
  const batch = writeBatch(db)
  batch.set(doc(db, COLLECTION, slug(trimmed)), {
    name: trimmed,
    blockedByUid: user.uid,
    blockedAt: serverTimestamp(),
  })
  for (const favDoc of favSnap.docs) {
    const favName = (favDoc.data().name as string | undefined) ?? ''
    if (favName.toLowerCase().includes(needle)) {
      batch.delete(favDoc.ref)
    }
  }
  await batch.commit()
}

export async function removeBlockedBrand(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id))
}

/** Does this place name match any blocked chain? Case-insensitive substring —
 *  pure, so it also runs client-side over add-by-name results. */
export function isBlockedBrand(placeName: string, blocked: BlockedBrand[]): boolean {
  const name = placeName.toLowerCase()
  return blocked.some((b) => name.includes(b.name.toLowerCase()))
}
