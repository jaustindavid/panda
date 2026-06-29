import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { auth, db } from './firebase.ts'

const COLLECTION = 'overrides'

/** Good-time-to-go override (PRD §5 PlaceOverride). panda's own data — not
 *  Maps content. Feeds the go-able filter's `closeBufferMin`. */
export interface PlaceOverride {
  placeId: string
  /** Minutes before posted close the place really stops seating. */
  closeBufferMin: number
  note: string
  updatedByUid: string
  updatedAt: number | null
}

interface OverrideDoc {
  closeBufferMin?: number
  note?: string
  updatedByUid?: string
  updatedAt?: unknown
}

function toMillis(v: unknown): number | null {
  if (
    v != null &&
    typeof v === 'object' &&
    'toMillis' in v &&
    typeof (v as { toMillis: unknown }).toMillis === 'function'
  ) {
    return (v as { toMillis: () => number }).toMillis()
  }
  return null
}

export async function getOverride(placeId: string): Promise<PlaceOverride | null> {
  const snap = await getDoc(doc(db, COLLECTION, placeId))
  if (!snap.exists()) return null
  const data = snap.data() as OverrideDoc
  return {
    placeId,
    closeBufferMin: data.closeBufferMin ?? 0,
    note: data.note ?? '',
    updatedByUid: data.updatedByUid ?? '',
    updatedAt: toMillis(data.updatedAt),
  }
}

/** Set/replace the override for a place (any member; rules enforce member). */
export async function setOverride(
  placeId: string,
  closeBufferMin: number,
  note: string,
): Promise<void> {
  const user = auth.currentUser
  if (user == null) throw new Error('Not signed in')
  await setDoc(doc(db, COLLECTION, placeId), {
    closeBufferMin,
    note,
    updatedByUid: user.uid,
    updatedAt: serverTimestamp(),
  })
}

export async function clearOverride(placeId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, placeId))
}

/** All overrides as a placeId → closeBufferMin map, for the go-able filter. */
export async function loadOverrideMap(): Promise<Record<string, number>> {
  const snap = await getDocs(collection(db, COLLECTION))
  const map: Record<string, number> = {}
  for (const d of snap.docs) {
    const data = d.data() as OverrideDoc
    if (typeof data.closeBufferMin === 'number') map[d.id] = data.closeBufferMin
  }
  return map
}
