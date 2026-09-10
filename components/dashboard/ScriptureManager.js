'use client'

import { useEffect, useMemo, useState } from 'react'
import { tagThemes, traditions, translationsFor } from '@/config/traditions'
import { scriptureFor } from '@/libs/scripture-core'
import PassageAltFields from '@/components/dashboard/PassageAltFields'

const inputClass =
  'w-full border border-line bg-ink px-4 py-3 text-paper outline-none focus:border-paper/40'

const traditionOptions = traditions.filter((t) => t.id !== 'none')
const seedThemeOptions = Object.entries(tagThemes).map(([tag, theme]) => ({ tag, theme, label: `${tag} (${theme})` }))

export default function ScriptureManager({ entries: initial, gaps = [], quotes = [], themeOptions = seedThemeOptions }) {
  const emptyDraft = {
    tradition: 'christianity',
    theme: themeOptions[0]?.theme || 'perseverance',
    ref: '',
    text: '',
    url: '',
  }
  const [items, setItems] = useState(initial)
  const [book, setBook] = useState(null)
  const [themes, setThemes] = useState(tagThemes)
  const [draft, setDraft] = useState(emptyDraft)
  const [previewN, setPreviewN] = useState('')
  const [previewTradition, setPreviewTradition] = useState('christianity')
  const [previewTranslation, setPreviewTranslation] = useState('niv')
  const [editing, setEditing] = useState(null)
  const [edit, setEdit] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/scripture')
      .then((r) => r.json())
      .then((d) => {
        setBook(d.data || null)
        if (d.themes) setThemes(d.themes)
      })
      .catch(() => {})
  }, [items])

  const previewQuote = quotes.find((q) => String(q.n) === previewN)
  const previewEntry = useMemo(() => {
    if (!book || !previewQuote) return null
    return scriptureFor(
      book,
      previewTradition,
      previewQuote.tags,
      previewQuote.slug,
      previewTranslation,
      previewQuote.theme,
      themes
    )
  }, [book, previewQuote, previewTradition, previewTranslation, themes])

  async function save(body) {
    const res = await fetch('/api/scripture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed')
    setItems(data.entries)
  }

  async function create(e) {
    e.preventDefault()
    if (!draft.ref.trim() || !draft.text.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      await save(draft)
      setDraft(emptyDraft)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function startEdit(entry) {
    setEditing(`${entry.tradition}/${entry.theme}/${entry.index}`)
    setEdit({ ...entry })
    setError('')
  }

  async function saveEdit() {
    if (!editing || !edit || busy) return
    setBusy(true)
    setError('')
    try {
      await save(edit)
      setEditing(null)
      setEdit(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(entry) {
    if (!confirm(`Delete this passage (${entry.tradition} / ${entry.tag})?`)) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/scripture', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradition: entry.tradition, theme: entry.theme, index: entry.index }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setItems(data.entries)
      if (editing === `${entry.tradition}/${entry.theme}/${entry.index}`) {
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
      {gaps.length ? (
        <div className="border border-line p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-quiet">Missing passages</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {gaps.map((g) => (
              <li key={`${g.tradition}-${g.theme}`} className="text-xs text-quiet">
                {g.label} · {g.tag}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="border border-line p-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-quiet">Preview</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs text-quiet">Quote #</span>
            <input
              value={previewN}
              onChange={(e) => setPreviewN(e.target.value)}
              placeholder="88"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs text-quiet">Tradition</span>
            <select
              value={previewTradition}
              onChange={(e) => setPreviewTradition(e.target.value)}
              className={inputClass}
            >
              {traditionOptions.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </label>
          {translationsFor(previewTradition).length ? (
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-xs text-quiet">Translation</span>
              <select
                value={previewTranslation}
                onChange={(e) => setPreviewTranslation(e.target.value)}
                className={inputClass}
              >
                {translationsFor(previewTradition).map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        {previewQuote ? (
          previewEntry ? (
            <blockquote className="mt-4 text-sm text-body/85">
              {previewEntry.text}
              <footer className="mt-2 text-quiet">— {previewEntry.ref}</footer>
            </blockquote>
          ) : (
            <p className="mt-4 text-sm text-quiet">No passage for this quote and tradition.</p>
          )
        ) : previewN ? (
          <p className="mt-4 text-sm text-quiet">Quote not found.</p>
        ) : null}
      </div>

      <form onSubmit={create} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-quiet">Tradition</span>
            <select
              value={draft.tradition}
              onChange={(e) => setDraft({ ...draft, tradition: e.target.value })}
              className={inputClass}
            >
              {traditionOptions.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-quiet">Theme (tag)</span>
            <select
              value={draft.theme}
              onChange={(e) => setDraft({ ...draft, theme: e.target.value })}
              className={inputClass}
            >
              {themeOptions.map((o) => (
                <option key={o.theme} value={o.theme}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>
        <input
          value={draft.ref}
          onChange={(e) => setDraft({ ...draft, ref: e.target.value })}
          placeholder="Reference (e.g. Philippians 4:13)"
          className={inputClass}
        />
        <textarea
          value={draft.text}
          onChange={(e) => setDraft({ ...draft, text: e.target.value })}
          placeholder="Passage text"
          rows={3}
          className={inputClass}
        />
        <input
          value={draft.url}
          onChange={(e) => setDraft({ ...draft, url: e.target.value })}
          placeholder="Source URL (optional)"
          className={inputClass}
        />
        <PassageAltFields tradition={draft.tradition} value={draft} onChange={setDraft} />
        <button type="submit" disabled={busy || !draft.ref.trim() || !draft.text.trim()} className="btn disabled:opacity-50">
          Add passage
        </button>
      </form>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <ul className="divide-y divide-line border border-line">
        {items.map((entry) => {
          const key = `${entry.tradition}/${entry.theme}/${entry.index}`
          const traditionLabel = traditions.find((t) => t.id === entry.tradition)?.label || entry.tradition
          return (
            <li key={key} className="px-4 py-4">
              {editing === key ? (
                <div className="space-y-3">
                  <p className="text-sm text-quiet">{traditionLabel} · {entry.tag}</p>
                  <input value={edit.ref} onChange={(e) => setEdit({ ...edit, ref: e.target.value })} className={inputClass} />
                  <textarea value={edit.text} onChange={(e) => setEdit({ ...edit, text: e.target.value })} rows={3} className={inputClass} />
                  <input value={edit.url} onChange={(e) => setEdit({ ...edit, url: e.target.value })} placeholder="URL" className={inputClass} />
                  <PassageAltFields tradition={edit.tradition} value={edit} onChange={setEdit} />
                  <div className="flex gap-2">
                    <button type="button" disabled={busy} onClick={saveEdit} className="btn disabled:opacity-50">Save</button>
                    <button type="button" disabled={busy} onClick={() => { setEditing(null); setEdit(null) }} className="btn disabled:opacity-50">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-paper">{traditionLabel} · {entry.tag}</p>
                    <p className="mt-1 text-sm text-quiet">{entry.ref}</p>
                    <p className="mt-2 text-sm text-body/85 line-clamp-3">{entry.text}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" disabled={busy} onClick={() => startEdit(entry)} className="btn disabled:opacity-50">Edit</button>
                    <button type="button" disabled={busy} onClick={() => remove(entry)} className="btn disabled:opacity-50">Delete</button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
