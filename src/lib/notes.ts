import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { auth, db } from './firebase.ts'

const COLLECTION = 'notes'

export interface Note {
  id: string
  placeId: string
  authorUid: string
  /** Denormalized display name (the circle's own data — not Maps content).
   *  A snapshot of who wrote it; fine if the author later renames. */
  authorName: string
  text: string
  /** Epoch ms, or null while a serverTimestamp write is still pending. */
  createdAt: number | null
  updatedAt: number | null
}

interface NoteDoc {
  placeId: string
  authorUid: string
  authorName?: string
  text: string
  createdAt?: unknown
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

/** All notes for a place (one-shot read — no live listener, per AGENTS.md).
 *  Sorted oldest-first client-side to avoid a composite index. */
export async function listNotes(placeId: string): Promise<Note[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTION), where('placeId', '==', placeId)),
  )
  const notes = snap.docs.map((d) => {
    const data = d.data() as NoteDoc
    return {
      id: d.id,
      placeId: data.placeId,
      authorUid: data.authorUid,
      authorName: data.authorName ?? 'Someone',
      text: data.text,
      createdAt: toMillis(data.createdAt),
      updatedAt: toMillis(data.updatedAt),
    }
  })
  notes.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
  return notes
}

export async function addNote(placeId: string, text: string): Promise<void> {
  const user = auth.currentUser
  if (user == null) throw new Error('Not signed in')
  await addDoc(collection(db, COLLECTION), {
    placeId,
    authorUid: user.uid,
    authorName: user.displayName ?? user.email ?? 'Someone',
    text,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

/** Edit own note (rules enforce author-only). */
export async function updateNote(noteId: string, text: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, noteId), {
    text,
    updatedAt: serverTimestamp(),
  })
}

/** Delete own note (rules enforce author-only). */
export async function deleteNote(noteId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, noteId))
}
