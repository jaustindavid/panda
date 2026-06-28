import { useEffect, useState } from 'react'
import { useAuth } from '../auth/auth-context.ts'
import { addNote, deleteNote, listNotes, updateNote } from '../lib/notes.ts'
import type { Note } from '../lib/notes.ts'
import { formatRelative } from '../lib/time.ts'

/** Shared, attributed notes for a place (PRD §7 F4). One-shot reads; reloads
 *  after each mutation. Any member can add; author can edit/delete own. */
export function NotesSection({ placeId }: { placeId: string }) {
  const { user } = useAuth()
  const [notes, setNotes] = useState<Note[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [nowMs] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false
    listNotes(placeId)
      .then((n) => !cancelled && setNotes(n))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      cancelled = true
    }
  }, [placeId])

  async function reload() {
    setNotes(await listNotes(placeId))
  }

  async function handleAdd() {
    const text = draft.trim()
    if (text === '' || busy) return
    setBusy(true)
    try {
      await addNote(placeId, text)
      setDraft('')
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveEdit(id: string) {
    const text = editText.trim()
    if (text === '') return
    setBusy(true)
    try {
      await updateNote(id, text)
      setEditingId(null)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this note?')) return
    setBusy(true)
    try {
      await deleteNote(id)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Notes
      </h2>

      <div className="flex gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a note for the circle…"
          rows={2}
          className="min-h-0 flex-1 resize-none rounded-xl bg-slate-900 px-3 py-2 text-sm outline-none placeholder:text-slate-600"
        />
        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={busy || draft.trim() === ''}
          className="self-end rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {error != null && <p className="text-sm text-red-400">{error}</p>}
      {notes == null && error == null && (
        <p className="text-sm text-slate-500">Loading notes…</p>
      )}
      {notes != null && notes.length === 0 && (
        <p className="text-sm text-slate-500">No notes yet — add the first.</p>
      )}

      <ul className="flex flex-col gap-2">
        {notes?.map((note) => {
          const mine = note.authorUid === user?.uid
          return (
            <li key={note.id} className="rounded-xl bg-slate-900 px-3 py-2">
              {editingId === note.id ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={2}
                    className="resize-none rounded-lg bg-slate-800 px-2 py-1 text-sm outline-none"
                  />
                  <div className="flex gap-3 text-sm">
                    <button
                      type="button"
                      onClick={() => void handleSaveEdit(note.id)}
                      disabled={busy}
                      className="font-medium text-emerald-300"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-slate-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap text-sm">{note.text}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <span>{note.authorName}</span>
                    {note.createdAt != null && (
                      <span>· {formatRelative(note.createdAt, nowMs)}</span>
                    )}
                    {mine && (
                      <span className="ml-auto flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(note.id)
                            setEditText(note.text)
                          }}
                          className="text-slate-400"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(note.id)}
                          className="text-slate-400"
                        >
                          Delete
                        </button>
                      </span>
                    )}
                  </div>
                </>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
