'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { parseBulkQuotes } from '@/libs/quote-text'
import { suggestQuoteLane } from '@/libs/quote-suggest'

const field = 'w-full border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-paper/40'

/** Suggested tag (or the closest one when unsure) and its theme. */
function laneFor(text, lanes, training) {
  const s = suggestQuoteLane(text, lanes, training)
  const tag = s.tags[0] || (s.scores[0]?.confidence > 0 ? s.scores[0].tag : lanes[0]?.name || '')
  return { tag, theme: lanes.find((l) => l.name === tag)?.theme || '' }
}

/** Paste many quotes → review (text, author, tag) → drafts. Duplicates start unticked. */
export default function BulkAdd({ catalog, tagCatalog, trainingQuotes }) {
  const [raw, setRaw] = useState('')
  const [rows, setRows] = useState(null)
  const [busy, setBusy] = useState(false)

  const review = () =>
    setRows(
      parseBulkQuotes(raw, catalog).map((r) => ({
        ...r,
        ...laneFor(r.text, tagCatalog, trainingQuotes),
        add: r.onSite == null && !r.repeat,
      }))
    )
  const set = (i, patch) => setRows((list) => list.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  async function create() {
    setBusy(true)
    for (const [i, r] of rows.entries()) {
      if (!r.add || r.n) continue
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: r.text, author: r.author, tags: r.tag ? [r.tag] : [], theme: r.theme }),
      })
      const data = await res.json().catch(() => ({}))
      set(i, res.ok ? { n: data.n, error: '' } : { error: data.error || 'Failed' })
    }
    setBusy(false)
  }

  if (!rows) {
    return (
      <div className="space-y-3">
        <textarea
          rows={12}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={'One quote per line. "— Name" at the end becomes the author.'}
          className={field}
        />
        <Button disabled={!raw.trim()} onClick={review}>
          Review
        </Button>
      </div>
    )
  }

  const count = rows.filter((r) => r.add && !r.n).length
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={i} className="grid gap-2 border border-line p-3 sm:grid-cols-[auto_1fr_12rem_9rem]">
            <input
              type="checkbox"
              checked={r.add}
              disabled={Boolean(r.n)}
              onChange={(e) => set(i, { add: e.target.checked })}
              className="mt-3 accent-paper"
            />
            <div className="space-y-1">
              <textarea rows={2} value={r.text} disabled={Boolean(r.n)} onChange={(e) => set(i, { text: e.target.value })} className={`${field} resize-none`} />
              <p className="text-xs text-quiet">
                {r.n ? `Created #${r.n}` : r.onSite != null ? `Already on the site (#${r.onSite})` : r.repeat ? 'Repeated above' : ''}
                {r.error ? <span className="text-red-400">{r.error}</span> : null}
              </p>
            </div>
            <input value={r.author} disabled={Boolean(r.n)} onChange={(e) => set(i, { author: e.target.value })} placeholder="Author (optional)" className={field} />
            <select
              value={r.tag}
              disabled={Boolean(r.n)}
              onChange={(e) => set(i, { tag: e.target.value, theme: tagCatalog.find((l) => l.name === e.target.value)?.theme || '' })}
              className={field}
            >
              {tagCatalog.map((l) => (
                <option key={l.name}>{l.name}</option>
              ))}
            </select>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button disabled={busy || !count} onClick={create}>
          {busy ? 'Creating…' : `Create ${count} drafts`}
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => setRows(null)}>
          Back
        </Button>
      </div>
    </div>
  )
}
