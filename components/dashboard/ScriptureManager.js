'use client'

import { useEffect, useMemo, useState } from 'react'
import { tagSeed } from '@/config/quotes'
import { traditions, translationsFor } from '@/config/traditions'
import { themeOptions as optionsFor } from '@/libs/tag-lane'
import { scriptureFor } from '@/libs/scripture-core'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import PassageAltFields from '@/components/dashboard/PassageAltFields'
import { themeLabel } from '@/config/themes'

const inputClass =
  'w-full border border-line bg-ink px-4 py-3 text-paper outline-none focus:border-paper/40'
const traditionOptions = traditions.filter((t) => t.id !== 'none')
const traditionLabel = Object.fromEntries(traditions.map((t) => [t.id, t.label]))
const seedThemeOptions = optionsFor(tagSeed)
/** 0 = gap, 1–2 = repeats often, 3+ = enough variety. */
const tone = (n) => (n === 0 ? 'danger' : n < 3 ? 'warn' : 'default')
const cellKey = (tradition, theme) => `${tradition}/${theme}`

function Select({ label, value, onChange, options, disabled }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs text-quiet">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="dash-select">
        {options.map(([id, text]) => (
          <option key={id} value={id}>
            {text}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function ScriptureManager({ entries: initial, quotes = [], themeOptions = seedThemeOptions }) {
  const [items, setItems] = useState(initial)
  const [book, setBook] = useState(null)
  const [themes, setThemes] = useState(null)
  const [filter, setFilter] = useState(null)
  /** Side panel: { mode: 'add' | 'edit' | 'test', value } */
  const [sheet, setSheet] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const traditionChoices = traditionOptions.map((t) => [t.id, t.label])
  const themeChoices = themeOptions.map((o) => [o.theme, o.label])
  const counts = useMemo(() => {
    const map = {}
    for (const e of items) map[cellKey(e.tradition, e.theme)] = (map[cellKey(e.tradition, e.theme)] || 0) + 1
    return map
  }, [items])
  /** [tag, number of themes] for the grouped header row. */
  const groups = themeOptions.reduce((acc, o) => {
    if (acc.at(-1)?.[0] === o.tag) acc.at(-1)[1]++
    else acc.push([o.tag, 1])
    return acc
  }, [])
  const shown = filter ? items.filter((e) => cellKey(e.tradition, e.theme) === cellKey(filter.tradition, filter.theme)) : items

  useEffect(() => {
    fetch(`/api/scripture?v=${Date.now()}`) // skip the CDN copy so edits show at once
      .then((r) => r.json())
      .then((d) => {
        setBook(d.data || null)
        if (d.themes) setThemes(d.themes)
      })
      .catch(() => {})
  }, [items])

  const test = sheet?.mode === 'test' ? sheet.value : null
  const testQuote = test && quotes.find((q) => String(q.n) === test.n)
  const testEntry =
    book && testQuote
      ? scriptureFor(book, test.tradition, testQuote.tags, testQuote.slug, test.translation, testQuote.theme, themes)
      : null

  const set = (patch) => setSheet((s) => ({ ...s, value: { ...s.value, ...patch } }))
  const open = (mode, value) => {
    setError('')
    setSheet({ mode, value })
  }
  const addAt = (at = filter) =>
    open('add', { tradition: at?.tradition || 'christianity', theme: at?.theme || themeOptions[0]?.theme || '', ref: '', text: '', url: '' })

  async function call(method, body) {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/scripture', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setItems(data.entries)
      return true
    } catch (err) {
      setError(err.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  async function submit(e) {
    e.preventDefault()
    if (await call('POST', sheet.value)) setSheet(null)
  }

  function remove(entry) {
    if (!confirm(`Delete this passage (${traditionLabel[entry.tradition]} / ${themeLabel(entry.theme)})?`)) return
    call('DELETE', { tradition: entry.tradition, theme: entry.theme, index: entry.index })
  }

  const v = sheet?.value
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => addAt()}>
          Add passage
        </Button>
        <Button size="sm" variant="outline" onClick={() => open('test', { n: '', tradition: 'christianity', translation: 'niv' })}>
          Test a card
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr>
              <th />
              {groups.map(([tag, span]) => (
                <th key={tag} colSpan={span} className="border-l border-line px-1 pt-2 text-center text-foreground">
                  {tag}
                </th>
              ))}
            </tr>
            <tr>
              <th className="py-2 pr-3 text-left">Coverage</th>
              {themeOptions.map((o) => (
                <th key={o.theme} className="px-1 py-2 text-center text-xs font-normal">
                  {themeLabel(o.theme)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {traditionOptions.map((t) => (
              <tr key={t.id}>
                <td className="py-1 pr-3 text-muted-foreground">{t.label}</td>
                {themeOptions.map((o) => {
                  const n = counts[cellKey(t.id, o.theme)] || 0
                  const on = filter && cellKey(filter.tradition, filter.theme) === cellKey(t.id, o.theme)
                  return (
                    <td key={o.theme} className="px-1 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => (n ? setFilter(on ? null : { tradition: t.id, theme: o.theme }) : addAt({ tradition: t.id, theme: o.theme }))}
                        aria-label={`${t.label} · ${themeLabel(o.theme)}: ${n}`}
                        className={on ? 'rounded-full ring-1 ring-primary' : undefined}
                      >
                        <Badge variant={tone(n)} className="min-w-8 justify-center">
                          {n}
                        </Badge>
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Red: no passage. Amber: 1–2, so readers see repeats. Green: 3+. Click a number to filter, a zero to add one.
      </p>

      {error && !sheet ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          {filter ? `${traditionLabel[filter.tradition]} · ${themeLabel(filter.theme)}` : 'All passages'} ({shown.length})
        </span>
        {filter ? (
          <span className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => addAt()}>
              Add here
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setFilter(null)}>
              Show all
            </Button>
          </span>
        ) : null}
      </div>

      <ul className="divide-y divide-line rounded-lg border border-line">
        {shown.map((entry) => (
          <li key={cellKey(entry.tradition, entry.theme) + entry.index} className="flex flex-wrap items-start justify-between gap-4 px-4 py-4">
            <div className="min-w-0 flex-1">
              <p className="text-paper">
                {traditionLabel[entry.tradition]} · {themeLabel(entry.theme)}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-quiet">
                {entry.ref}
                {entry.translation ? <span>· {entry.translation}</span> : null}
                <Badge variant={entry.verified ? 'default' : 'warn'}>{entry.verified ? 'Verified' : 'Unchecked'}</Badge>
              </p>
              <p className="mt-2 line-clamp-3 text-sm text-body/85">{entry.text}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={busy} onClick={() => open('edit', { ...entry })}>
                Edit
              </Button>
              <Button size="sm" variant="destructive" disabled={busy} onClick={() => remove(entry)}>
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {sheet?.mode === 'test' ? (
        <Sheet title="Test a card" onClose={() => setSheet(null)}>
          <label className="block">
            <span className="mb-2 block text-xs text-quiet">Quote #</span>
            <input value={v.n} onChange={(e) => set({ n: e.target.value })} placeholder="20" className={inputClass} />
          </label>
          <Select label="Tradition" value={v.tradition} onChange={(tradition) => set({ tradition })} options={traditionChoices} />
          {translationsFor(v.tradition).length ? (
            <Select
              label="Translation"
              value={v.translation}
              onChange={(translation) => set({ translation })}
              options={translationsFor(v.tradition).map((t) => [t.id, t.label])}
            />
          ) : null}
          {testQuote ? (
            testEntry ? (
              <blockquote className="text-sm text-body/85">
                {testEntry.text}
                <footer className="mt-2 text-quiet">— {testEntry.ref}</footer>
              </blockquote>
            ) : (
              <p className="text-sm text-quiet">No passage for this quote and tradition.</p>
            )
          ) : v.n ? (
            <p className="text-sm text-quiet">Quote not found.</p>
          ) : null}
        </Sheet>
      ) : sheet ? (
        <Sheet title={sheet.mode === 'edit' ? 'Edit passage' : 'Add passage'} onClose={() => setSheet(null)}>
          <form onSubmit={submit} className="space-y-4">
            {/* An edit keeps its slot: moving it would reuse `index` inside a different list. */}
            <Select
              label="Tradition"
              value={v.tradition}
              onChange={(tradition) => set({ tradition })}
              options={traditionChoices}
              disabled={sheet.mode === 'edit'}
            />
            <Select
              label="Theme (tag)"
              value={v.theme}
              onChange={(theme) => set({ theme })}
              options={themeChoices}
              disabled={sheet.mode === 'edit'}
            />
            <input value={v.ref} onChange={(e) => set({ ref: e.target.value })} placeholder="Reference (e.g. Philippians 4:13)" className={inputClass} />
            <textarea value={v.text} onChange={(e) => set({ text: e.target.value })} placeholder="Passage text" rows={4} className={inputClass} />
            <input value={v.url} onChange={(e) => set({ url: e.target.value })} placeholder="Source URL (link to the exact verse)" className={inputClass} />
            <input value={v.translation || ''} onChange={(e) => set({ translation: e.target.value })} placeholder="Translation (e.g. NIV, Sahih International)" className={inputClass} />
            <textarea value={v.original || ''} onChange={(e) => set({ original: e.target.value })} placeholder="Original-language text (optional)" rows={2} className={inputClass} />
            <input value={v.lang || ''} onChange={(e) => set({ lang: e.target.value })} placeholder="Original language code (ar, he, sa, pa…)" className={inputClass} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={Boolean(v.verified)} onChange={(e) => set({ verified: e.target.checked })} />
              Checked against the source
            </label>
            <PassageAltFields tradition={v.tradition} value={v} onChange={(next) => set(next)} />
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <Button type="submit" disabled={busy || !v.ref.trim() || !v.text.trim()}>
              {busy ? 'Saving…' : 'Save passage'}
            </Button>
          </form>
        </Sheet>
      ) : null}
    </div>
  )
}
