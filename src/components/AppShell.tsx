import type { ReactNode } from 'react'

interface AppShellProps {
  /** The active flow's content — discovery mounts here in M2. */
  children: ReactNode
}

/**
 * The mobile-first chrome every flow mounts into: a compact top bar and a
 * scrollable content region sized to the viewport. Navigation between flows
 * (discovery / visits / roulette) lands in a later milestone; the shell just
 * establishes the frame and the safe-area-aware full-height layout.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="mx-auto flex h-full max-w-md flex-col bg-slate-950 text-slate-100">
      <header className="flex shrink-0 items-center gap-2 border-b border-slate-800 px-4 py-3">
        <span className="text-xl" aria-hidden="true">
          🐼
        </span>
        <h1 className="text-lg font-semibold tracking-tight">panda</h1>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</main>
    </div>
  )
}
