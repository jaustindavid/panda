import type { ReactNode } from 'react'

interface AppShellProps {
  /** The active flow's content — discovery mounts here. */
  children: ReactNode
  /** Optional right-aligned header action (e.g. sign-out). */
  headerRight?: ReactNode
}

/**
 * The mobile-first chrome every flow mounts into: a compact top bar and a
 * scrollable content region sized to the viewport. Navigation between flows
 * (discovery / visits / roulette) lands in a later milestone; the shell just
 * establishes the frame and the safe-area-aware full-height layout.
 */
export function AppShell({ children, headerRight }: AppShellProps) {
  return (
    <div className="mx-auto flex h-full max-w-md flex-col bg-slate-950 text-slate-100">
      <header className="flex shrink-0 items-center gap-2 border-b border-slate-800 px-4 py-3">
        <img
          src="/icon-192.png"
          alt=""
          className="h-6 w-6 rounded"
          aria-hidden="true"
        />
        <h1 className="text-lg font-semibold tracking-tight">panda</h1>
        {headerRight != null && <div className="ml-auto">{headerRight}</div>}
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</main>
    </div>
  )
}
