import { createContext, use } from 'react'
import type { User } from 'firebase/auth'

export interface AuthState {
  /** The signed-in Firebase user, or null when signed out. */
  user: User | null
  /** True until the initial auth state resolves (avoids a sign-in flash). */
  loading: boolean
  /** Whether `user`'s email is on the circle allowlist. */
  allowed: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = use(AuthContext)
  if (ctx == null) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
