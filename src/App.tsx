import { AppShell } from './components/AppShell.tsx'
import { AuthProvider } from './auth/AuthProvider.tsx'
import { useAuth } from './auth/auth-context.ts'
import { SignInScreen } from './auth/SignInScreen.tsx'
import { NotAllowedScreen } from './auth/NotAllowedScreen.tsx'
import { DiscoveryScreen } from './discovery/DiscoveryScreen.tsx'

/** Routes between auth states: loading → sign-in → not-allowed → discovery. */
function Gate() {
  const { user, loading, allowed, signOut } = useAuth()

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center text-slate-500">
          Loading…
        </div>
      </AppShell>
    )
  }
  if (user == null) {
    return (
      <AppShell>
        <SignInScreen />
      </AppShell>
    )
  }
  if (!allowed) {
    return (
      <AppShell>
        <NotAllowedScreen />
      </AppShell>
    )
  }
  return (
    <AppShell
      headerRight={
        <button
          type="button"
          onClick={() => void signOut()}
          className="text-sm text-slate-400"
        >
          Sign out
        </button>
      }
    >
      <DiscoveryScreen />
    </AppShell>
  )
}

function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}

export default App
