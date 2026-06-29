import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { auth, db } from './firebase.ts'

const COLLECTION = 'visits'

export interface Visit {
  id: string
  placeId: string
  byUid: string
  /** Denormalized member name (the circle's own data, not Maps content). */
  byName: string
  /** Epoch ms, or null while the serverTimestamp write is pending. */
  at: number | null
}

interface VisitDoc {
  placeId: string
  byUid: string
  byName?: string
  at?: unknown
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

function fromDoc(id: string, data: VisitDoc): Visit {
  return {
    id,
    placeId: data.placeId,
    byUid: data.byUid,
    byName: data.byName ?? 'Someone',
    at: toMillis(data.at),
  }
}

/** Log a "here now" visit for the current member (PRD §7 F3). */
export async function logVisit(placeId: string): Promise<void> {
  const user = auth.currentUser
  if (user == null) throw new Error('Not signed in')
  await addDoc(collection(db, COLLECTION), {
    placeId,
    byUid: user.uid,
    byName: user.displayName ?? user.email ?? 'Someone',
    at: serverTimestamp(),
  })
}

/** All visits (one-shot), newest-first. Small data — sorted client-side. */
export async function listVisits(): Promise<Visit[]> {
  const snap = await getDocs(collection(db, COLLECTION))
  const visits = snap.docs.map((d) => fromDoc(d.id, d.data() as VisitDoc))
  visits.sort((a, b) => (b.at ?? 0) - (a.at ?? 0))
  return visits
}

/** Visits for one place (newest-first) — for the place detail. */
export async function listVisitsForPlace(placeId: string): Promise<Visit[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTION), where('placeId', '==', placeId)),
  )
  const visits = snap.docs.map((d) => fromDoc(d.id, d.data() as VisitDoc))
  visits.sort((a, b) => (b.at ?? 0) - (a.at ?? 0))
  return visits
}

/** Delete own visit (rules enforce creator-only). */
export async function deleteVisit(visitId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, visitId))
}
