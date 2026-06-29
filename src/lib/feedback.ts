import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase.ts'

const COLLECTION = 'feedback'

/**
 * Submit a piece of app feedback (owner FR — capture + review later). The
 * author is stamped from the signed-in user (denormalized name, like notes —
 * the circle's own data, not Maps content). Throws if signed out or blank.
 */
export async function submitFeedback(text: string): Promise<void> {
  const user = auth.currentUser
  if (user == null) throw new Error('Not signed in')
  const trimmed = text.trim()
  if (trimmed === '') throw new Error('Feedback is empty')
  await addDoc(collection(db, COLLECTION), {
    authorUid: user.uid,
    authorName: user.displayName ?? user.email ?? 'Someone',
    text: trimmed,
    createdAt: serverTimestamp(),
  })
}
