'use client'

import { useState } from 'react'

const inputClass =
  'w-full border border-line bg-ink px-4 py-3 text-paper outline-none focus:border-paper/40'

const empty = { name: '', moodLabel: '', theme: '', hashtags: '' }

function tagApi(path, init) {
  return fetch(`/api/tags/${encodeURIComponent(path)}`, init)
}

function usageLine(tag) {
  const quotes = tag.quotes ?? tag.count ?? 0
  const posts = tag.posts ?? 0
  const books = tag.books ?? 0
  const passages = tag.passages ?? 0
  return [
    tag.moodLabel ? `Mood: ${tag.moodLabel}` : 'No mood',
    tag.theme ? `Theme: ${tag.theme}` : 'No theme',
    `${quotes} quote${quotes === 1 ? '' : 's'}`,
    `${posts} post${posts === 1 ? '' : 's'}`,
    `${books} book${books === 1 ? '' : 's'}`,
    `${passages} passage${passages === 1 ? '' : 's'}`,
  ].join(' · ')
}

export default function TagManager({ tags: initial }) {
  const [items, setItems] = useState(initial)
  const [draft, setDraft] = useState(empty)
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
      setDraft(empty)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function startEdit(tag) {
    setEditing(tag.name)
    setEdit({
      name: tag.name,
      moodLabel: tag.moodLabel || '',
      theme: tag.theme || '',
      hashtags: tag.hashtags || '',
    })
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
    const quotes = tag.quotes ?? tag.count ?? 0
    const posts = tag.posts ?? 0
    const books = tag.books ?? 0
    const passages = tag.passages ?? 0
    const bits = []
    if (quotes) bits.push(`${quotes} quote${quotes === 1 ? '' : 's'}`)
    if (posts) bits.push(`${posts} post${posts === 1 ? '' : 's'}`)
    if (books) bits.push(`${books} book${books === 1 ? '' : 's'}`)
    if (passages) bits.push(`${passages} passage${passages === 1 ? '' : 's'}`)
    const msg = bits.length
      ? `Delete "${tag.name}" and clear it from ${bits.join(' and ')}?`
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

  function fields(value, setValue) {
    return (
      <>
        <input
          value={value.name}
          onChange={(e) => setValue({ ...value, name: e.target.value })}
          placeholder="Motivation"
          className={inputClass}
        />
        <input
          value={value.moodLabel}
          onChange={(e) => setValue({ ...value, moodLabel: e.target.value })}
          placeholder="Need a push"
          className={inputClass}
        />
        <input
          value={value.theme}
          onChange={(e) => setValue({ ...value, theme: e.target.value })}
          placeholder="perseverance"
          className={inputClass}
        />
        <input
          value={value.hashtags}
          onChange={(e) => setValue({ ...value, hashtags: e.target.value })}
          placeholder="#motivation #bebetteryou"
          className={inputClass}
        />
      </>
    )
  }

  return (
    <div className="space-y-8">
      <form onSubmit={create} className="space-y-2">
        <div className="grid gap-3 lg:grid-cols-4">
          <span className="text-[11px] uppercase tracking-[0.2em] text-quiet">Name</span>
          <span className="text-[11px] uppercase tracking-[0.2em] text-quiet">Mood</span>
          <span className="text-[11px] uppercase tracking-[0.2em] text-quiet">Theme</span>
          <span className="text-[11px] uppercase tracking-[0.2em] text-quiet">Hashtags</span>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          {fields(draft, setDraft)}
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
              <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto_auto] lg:items-end">
                {fields(edit, setEdit)}
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
                  <p className="text-sm text-quiet">{usageLine(tag)}</p>
                  {tag.hashtags ? <p className="mt-1 text-xs text-quiet/80">{tag.hashtags}</p> : null}
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
