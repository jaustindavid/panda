import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell.tsx'
import { AuthProvider } from './auth/AuthProvider.tsx'
import { useAuth } from './auth/auth-context.ts'
import { SignInScreen } from './auth/SignInScreen.tsx'
import { NotAllowedScreen } from './auth/NotAllowedScreen.tsx'
import { DiscoveryProvider } from './discovery/DiscoveryProvider.tsx'
import { DiscoveryScreen } from './discovery/DiscoveryScreen.tsx'
import { PlaceDetailRoute } from './place/PlaceDetailRoute.tsx'
import { AddByNameScreen } from './place/AddByNameScreen.tsx'
import { VisitsScreen } from './visits/VisitsScreen.tsx'
import { RouletteScreen } from './roulette/RouletteScreen.tsx'
import { FeedbackScreen } from './feedback/FeedbackScreen.tsx'

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? 'text-slate-100' : 'text-slate-500'
}

/** The signed-in, allowlisted app: routed Discovery / detail / Visits, with
 *  discovery data shared across routes so back/forward never re-fetch. */
function SignedInApp() {
  const { signOut } = useAuth()
  return (
    <DiscoveryProvider>
      <AppShell
        headerRight={
          <div className="flex items-center gap-3 text-sm">
            <NavLink to="/" end className={navClass}>
              Eat
            </NavLink>
            <NavLink to="/visits" className={navClass}>
              Visits
            </NavLink>
            <NavLink to="/feedback" className={navClass}>
              Feedback
            </NavLink>
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
        <Routes>
          <Route path="/" element={<DiscoveryScreen />} />
          <Route path="/place/:placeId" element={<PlaceDetailRoute />} />
          <Route path="/add" element={<AddByNameScreen />} />
          <Route path="/roulette" element={<RouletteScreen />} />
          <Route path="/visits" element={<VisitsScreen />} />
          <Route path="/feedback" element={<FeedbackScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </DiscoveryProvider>
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
