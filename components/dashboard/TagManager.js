'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { manageQuotesHref } from '@/libs/dashboard-ops'

const inputClass =
  'w-full border border-line bg-ink px-4 py-3 text-paper outline-none focus:border-paper/40'
const empty = { name: '', moodLabel: '', theme: '', hashtags: '' }
const fields = [
  ['name', 'Name', 'Motivation'],
  ['moodLabel', 'Mood label (homepage chip)', 'Need a push'],
  ['theme', 'Scripture theme', 'perseverance'],
  ['hashtags', 'Hashtags', '#motivation #bebetteryou'],
]
const usage = ['quotes', 'posts', 'books', 'passages']
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

export default function TagManager({ tags: initial }) {
  const [items, setItems] = useState(initial)
  /** Side panel: { original: name | null, value } */
  const [sheet, setSheet] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const themes = [...new Set(items.map((t) => t.theme).filter(Boolean))]
  const count = (tag, key) => tag[key] ?? (key === 'quotes' ? tag.count : 0) ?? 0

  async function call(path, init) {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...init })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setItems(data.tags)
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
    const { original, value } = sheet
    const ok = original
      ? await call(`/api/tags/${encodeURIComponent(original)}`, { method: 'PATCH', body: JSON.stringify(value) })
      : await call('/api/tags', { method: 'POST', body: JSON.stringify(value) })
    if (ok) setSheet(null)
  }

  function remove(tag) {
    const bits = usage.filter((k) => count(tag, k)).map((k) => plural(count(tag, k), k.slice(0, -1)))
    const msg = bits.length ? `Delete "${tag.name}" and clear it from ${bits.join(' and ')}?` : `Delete "${tag.name}"?`
    if (confirm(msg)) call(`/api/tags/${encodeURIComponent(tag.name)}`, { method: 'DELETE' })
  }

  const open = (tag) => {
    setError('')
    setSheet({ original: tag?.name || null, value: tag ? Object.fromEntries(fields.map(([k]) => [k, tag[k] || ''])) : empty })
  }

  return (
    <div className="space-y-4">
      <Button size="sm" onClick={() => open(null)}>
        Add tag
      </Button>
      {error && !sheet ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead>
            <tr>
              <th className="py-2 pr-4">Tag</th>
              <th className="py-2 pr-4">Mood label</th>
              <th className="py-2 pr-4">Theme</th>
              {usage.map((k) => (
                <th key={k} className="py-2 pr-4 text-right capitalize">
                  {k}
                </th>
              ))}
              <th className="py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((tag) => (
              <tr key={tag.name}>
                <td className="py-3 pr-4">
                  <span className="block text-foreground">{tag.name}</span>
                  {tag.hashtags ? <span className="block text-xs text-muted-foreground">{tag.hashtags}</span> : null}
                </td>
                <td className="py-3 pr-4">{tag.moodLabel || '—'}</td>
                <td className="py-3 pr-4">
                  {tag.theme || '—'}
                  {tag.gaps ? (
                    <Badge variant="warn" className="ml-2" title="Tradition × theme combinations with no passage yet">
                      {tag.gaps} gaps
                    </Badge>
                  ) : null}
                </td>
                {usage.map((k) => (
                  <td key={k} className="py-3 pr-4 text-right">
                    {k === 'quotes' && count(tag, k) ? (
                      <Link href={manageQuotesHref({ section: 'cards', tag: tag.name })} className="underline-offset-2 hover:underline">
                        {count(tag, k)}
                      </Link>
                    ) : (
                      count(tag, k)
                    )}
                  </td>
                ))}
                <td className="py-3 text-right">
                  <span className="inline-flex gap-2">
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => open(tag)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" disabled={busy} onClick={() => remove(tag)}>
                      Delete
                    </Button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sheet ? (
        <Sheet title={sheet.original ? `Edit ${sheet.original}` : 'Add tag'} onClose={() => setSheet(null)}>
          <form onSubmit={submit} className="space-y-4">
            {fields.map(([key, label, placeholder]) => (
              <label key={key} className="block">
                <span className="mb-2 block text-xs text-quiet">{label}</span>
                <input
                  value={sheet.value[key]}
                  onChange={(e) => setSheet((s) => ({ ...s, value: { ...s.value, [key]: e.target.value } }))}
                  placeholder={placeholder}
                  list={key === 'theme' ? 'tag-themes' : undefined}
                  className={inputClass}
                />
              </label>
            ))}
            {/* Suggest existing themes — a typo here would silently leave the tag with no scripture. */}
            <datalist id="tag-themes">
              {themes.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <Button type="submit" disabled={busy || !sheet.value.name.trim()}>
              {busy ? 'Saving…' : 'Save tag'}
            </Button>
          </form>
        </Sheet>
      ) : null}
    </div>
  )
}
