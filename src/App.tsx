import { useState } from 'react'
import { AppShell } from './components/AppShell.tsx'
import { AuthProvider } from './auth/AuthProvider.tsx'
import { useAuth } from './auth/auth-context.ts'
import { SignInScreen } from './auth/SignInScreen.tsx'
import { NotAllowedScreen } from './auth/NotAllowedScreen.tsx'
import { DiscoveryScreen } from './discovery/DiscoveryScreen.tsx'
import { VisitsScreen } from './visits/VisitsScreen.tsx'

/** The signed-in, allowlisted app: Discovery ⇄ Visits, with sign-out. */
function SignedInApp() {
  const { signOut } = useAuth()
  const [view, setView] = useState<'discovery' | 'visits'>('discovery')

  const tab = (key: 'discovery' | 'visits', label: string) => (
    <button
      type="button"
      onClick={() => setView(key)}
      className={view === key ? 'text-slate-100' : 'text-slate-500'}
    >
      {label}
    </button>
  )

  return (
    <AppShell
      headerRight={
        <div className="flex items-center gap-3 text-sm">
          {tab('discovery', 'Eat')}
          {tab('visits', 'Visits')}
          <button
            type="button"
            onClick={() => void signOut()}
            className="text-slate-500"
          >
            Sign out
          </button>
        </div>
      }
    >
      {view === 'discovery' ? <DiscoveryScreen /> : <VisitsScreen />}
    </AppShell>
  )
}

/** Routes between auth states: loading → sign-in → not-allowed → app. */
function Gate() {
  const { user, loading, allowed } = useAuth()

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
  return <SignedInApp />
}

function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}

export default App
