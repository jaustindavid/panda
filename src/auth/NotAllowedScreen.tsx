import { useAuth } from './auth-context.ts'

/** Signed-in but not on the circle allowlist. */
export function NotAllowedScreen() {
  const { user, signOut } = useAuth()

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
      <div>
        <h1 className="text-2xl font-medium">Not on the list</h1>
        <p className="mt-1 max-w-xs text-sm text-slate-400">
          {user?.email
            ? `${user.email} isn't in the circle yet.`
            : "This account isn't in the circle yet."}{' '}
          Ask the owner to add you.
        </p>
      </div>
      <button
        type="button"
        onClick={() => void signOut()}
        className="rounded-full border border-slate-700 px-6 py-3 font-medium text-slate-200"
      >
        Sign out
      </button>
    </div>
  )
}
