import { useState } from 'react'
import { useAuth } from './auth-context.ts'

/** Signed-out state: a single Google sign-in action. */
export function SignInScreen() {
  const { signIn } = useAuth()
  const [busy, setBusy] = useState(false)

  async function handleSignIn() {
    setBusy(true)
    try {
      await signIn()
      // signInWithRedirect navigates away; nothing runs after on success.
    } catch (err) {
      console.error('sign-in failed', err)
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
      <div>
        <p className="text-2xl font-medium">Where can we eat?</p>
        <p className="mt-1 text-sm text-slate-400">Sign in to join the circle.</p>
      </div>
      <button
        type="button"
        onClick={handleSignIn}
        disabled={busy}
        className="rounded-full bg-slate-100 px-6 py-3 font-medium text-slate-900 disabled:opacity-60"
      >
        {busy ? 'Signing in…' : 'Sign in with Google'}
      </button>
    </div>
  )
}
