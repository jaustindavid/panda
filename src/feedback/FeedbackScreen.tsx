import { useState } from 'react'
import { useAuth } from '../auth/auth-context.ts'
import { submitFeedback } from '../lib/feedback.ts'

/** Feedback capture (owner FR): a single text box; the author is auto-stamped
 *  from sign-in (no typed username). Writes to the `feedback` collection,
 *  reviewed later. */
export function FeedbackScreen() {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)
  const name = user?.displayName ?? user?.email ?? 'you'

  async function handleSubmit() {
    if (text.trim() === '' || status === 'sending') return
    setStatus('sending')
    setError(null)
    try {
      await submitFeedback(text)
      setText('')
      setStatus('sent')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('idle')
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <h1 className="text-lg font-semibold">Feedback</h1>
      <p className="text-sm text-slate-400">
        Posting as <span className="text-slate-200">{name}</span>. We’ll read it later.
      </p>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          if (status === 'sent') setStatus('idle')
        }}
        rows={6}
        placeholder="What’s working, what’s not, what you wish it did…"
        className="w-full rounded-xl bg-slate-900 p-3 text-sm text-slate-100 placeholder:text-slate-600"
      />
      {error != null && <p className="text-sm text-red-400">{error}</p>}
      {status === 'sent' && <p className="text-sm text-emerald-300">Thanks — sent. 🐼</p>}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={text.trim() === '' || status === 'sending'}
        className="rounded-full bg-slate-100 py-3 text-center font-medium text-slate-900 disabled:opacity-60"
      >
        {status === 'sending' ? 'Sending…' : 'Send feedback'}
      </button>
    </div>
  )
}
