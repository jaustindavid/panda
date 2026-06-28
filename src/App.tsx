import { AppShell } from './components/AppShell.tsx'

/**
 * Placeholder home. The discovery flow (geolocation → Nearby Search →
 * go-able filter → list/map, PRD §7 F1) replaces this body in M2; for now
 * it just confirms the shell, styling, and PWA wiring all run with no
 * backend.
 */
function App() {
  return (
    <AppShell>
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <p className="text-2xl font-medium">Where can we eat?</p>
        <p className="max-w-xs text-sm text-slate-400">
          The discovery flow lands here in M2. For now this is just the app
          shell — installable, dark-first, no backend.
        </p>
      </div>
    </AppShell>
  )
}

export default App
