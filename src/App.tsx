import { AppShell } from './components/AppShell.tsx'
import { AuthProvider } from './auth/AuthProvider.tsx'
import { useAuth } from './auth/auth-context.ts'
import { SignInScreen } from './auth/SignInScreen.tsx'
import { NotAllowedScreen } from './auth/NotAllowedScreen.tsx'

/**
 * Placeholder home for allowlisted members. The discovery flow (geolocation
 * → Nearby Search → go-able filter → list/map, PRD §7 F1) replaces this body
 * in M2.
 */
function Home() {
  const { user, signOut } = useAuth()
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <p className="text-2xl font-medium">Where can we eat?</p>
      <p className="max-w-xs text-sm text-slate-400">
        Signed in as {user?.displayName ?? user?.email}. The discovery flow
        lands here in M2.
      </p>
      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-2 text-sm text-slate-500 underline"
      >
        Sign out
      </button>
    </div>
  )
}

/** Routes between auth states: loading → sign-in → not-allowed → app. */
function Gate() {
  const { user, loading, allowed } = useAuth()

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Loading…
      </div>
    )
  }
  if (user == null) return <SignInScreen />
  if (!allowed) return <NotAllowedScreen />
  return <Home />
}

function App() {
  return (
    <AuthProvider>
      <AppShell>
        <Gate />
      </AppShell>
    </AuthProvider>
  )
}

export default App
