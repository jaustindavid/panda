import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase.ts'
import { isAllowed } from '../lib/allowlist.ts'
import { AuthContext } from './auth-context.ts'
import type { AuthState } from './auth-context.ts'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Don't swallow redirect-sign-in failures — when the redirect handshake
    // fails, auth state never establishes and the app looks silently
    // signed-out (flog M2 rake). Surface it.
    getRedirectResult(auth).catch((err: unknown) => {
      console.error('getRedirectResult failed', err)
    })
    // Auth session observer (not a Firestore data listener — the no-real-time
    // guardrail is about data sync; this is the canonical auth pattern).
    return onAuthStateChanged(auth, (next) => {
      setUser(next)
      setLoading(false)
    })
  }, [])

  const value: AuthState = {
    user,
    loading,
    allowed: isAllowed(user?.email),
    signIn: () => signInWithRedirect(auth, googleProvider),
    signOut: () => firebaseSignOut(auth),
  }

  return <AuthContext value={value}>{children}</AuthContext>
}
