'use client'

import { useState } from 'react'

const inputClass =
  'w-full border border-line bg-ink px-4 py-3 text-paper outline-none focus:border-paper/40'

function tagApi(path, init) {
  return fetch(`/api/tags/${encodeURIComponent(path)}`, init)
}

export default function TagManager({ tags: initial }) {
  const [items, setItems] = useState(initial)
  const [draft, setDraft] = useState({ name: '', moodLabel: '' })
  const [editing, setEditing] = useState(null)
  const [edit, setEdit] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function create(e) {
    e.preventDefault()
    if (!draft.name.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setItems(data.tags)
      setDraft({ name: '', moodLabel: '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function startEdit(tag) {
    setEditing(tag.name)
    setEdit({ name: tag.name, moodLabel: tag.moodLabel || '' })
    setError('')
  }

  async function saveEdit() {
    if (!editing || !edit || busy) return
    setBusy(true)
    setError('')
    try {
      const res = await tagApi(editing, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edit),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setItems(data.tags)
      setEditing(null)
      setEdit(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(tag) {
    const msg =
      tag.count > 0
        ? `Delete "${tag.name}" and remove it from ${tag.count} quote${tag.count === 1 ? '' : 's'}?`
        : `Delete "${tag.name}"?`
    if (!confirm(msg)) return
    setBusy(true)
    setError('')
    try {
      const res = await tagApi(tag.name, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setItems(data.tags)
      if (editing === tag.name) {
        setEditing(null)
        setEdit(null)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={create} className="space-y-2">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <span className="text-[11px] uppercase tracking-[0.2em] text-quiet">Name</span>
          <span className="text-[11px] uppercase tracking-[0.2em] text-quiet">Mood label</span>
          <span className="hidden sm:block" aria-hidden="true" />
        </div>
        <div className="flex gap-3">
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Motivation"
            className={`${inputClass} min-w-0 flex-1`}
          />
          <input
            value={draft.moodLabel}
            onChange={(e) => setDraft({ ...draft, moodLabel: e.target.value })}
            placeholder="Need a push (optional)"
            className={`${inputClass} min-w-0 flex-1`}
          />
          <button type="submit" disabled={busy || !draft.name.trim()} className="btn flex shrink-0 items-center px-7 py-0 disabled:opacity-50">
            Add tag
          </button>
        </div>
      </form>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <ul className="divide-y divide-line border border-line">
        {items.map((tag) => (
          <li key={tag.name} className="px-4 py-4">
            {editing === tag.name ? (
              <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
                <label className="block">
                  <span className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-quiet">Name</span>
                  <input
                    value={edit.name}
                    onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-quiet">Mood label</span>
                  <input
                    value={edit.moodLabel}
                    onChange={(e) => setEdit({ ...edit, moodLabel: e.target.value })}
                    placeholder="Optional"
                    className={inputClass}
                  />
                </label>
                <button type="button" disabled={busy} onClick={saveEdit} className="btn disabled:opacity-50">
                  Save
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setEditing(null)
                    setEdit(null)
                  }}
                  className="btn disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-paper">{tag.name}</p>
                  <p className="text-sm text-quiet">
                    {tag.moodLabel ? `Mood: ${tag.moodLabel}` : 'No mood label'} · {tag.count} quote
                    {tag.count === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={busy} onClick={() => startEdit(tag)} className="btn disabled:opacity-50">
                    Edit
                  </button>
                  <button type="button" disabled={busy} onClick={() => remove(tag)} className="btn disabled:opacity-50">
                    Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
