import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface AppShellProps {
  /** The active flow's content — discovery / detail / add / roulette / visits. */
  children: ReactNode
  /** Optional right-aligned header action (nav + sign-out). */
  headerRight?: ReactNode
}

/**
 * The mobile-first chrome every flow mounts into: a compact top bar and a
 * scrollable content region sized to the viewport. The brand (icon + wordmark)
 * doubles as a home link. It's banner navigation, not a page heading — each
 * routed screen owns its own single <h1>.
 */
export function AppShell({ children, headerRight }: AppShellProps) {
  return (
    <div className="mx-auto flex h-full max-w-md flex-col bg-slate-950 text-slate-100">
      <header className="flex shrink-0 items-center border-b border-slate-800 px-4 py-3">
        <Link
          to="/"
          title="Home"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight"
        >
          <img
            src="/icon-192.png"
            alt=""
            className="h-6 w-6 rounded"
            aria-hidden="true"
          />
          panda
        </Link>
        {headerRight != null && <div className="ml-auto">{headerRight}</div>}
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</main>
    </div>
  )
}
