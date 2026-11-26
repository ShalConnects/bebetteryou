'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/dashboard/toast'
import { ray } from '@/config/ray'

const field = 'w-full border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-paper/40'
const tone = { draft: 'muted', approved: 'default', generating: 'warn', ready: 'default', posted: 'default', failed: 'danger' }
const label = { draft: 'Needs approval', approved: 'Approved', generating: 'Generating', ready: 'Ready', posted: 'Posted', failed: 'Failed' }
const day = (iso) => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
const words = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0)

/** One Ray video: edit the hook and script, approve, then follow it to posted. */
function RayItem({ item }) {
  const [row, setRow] = useState(item)
  const [busy, setBusy] = useState(false)
  const locked = ['generating', 'ready', 'posted'].includes(row.status)

  async function save(approve) {
    setBusy(true)
    try {
      const res = await fetch('/api/social/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ray: true, slug: row.slug, hook: row.hook, script: row.script, approve }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setRow({ ...row, ...data.ray })
      toast(approve ? (data.ray.status === 'generating' ? 'Approved and sent to Higgsfield' : 'Approved') : 'Saved')
    } catch (err) {
      toast(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="space-y-3 border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-paper">
          {day(row.postAt)} · #{row.n} <span className="text-muted-foreground">{row.text}</span>
        </p>
        <Badge variant={tone[row.status]}>{label[row.status]}</Badge>
      </div>
      <input
        value={row.hook}
        disabled={locked}
        onChange={(e) => setRow({ ...row, hook: e.target.value })}
        placeholder="On-screen hook, e.g. FEEL BEHIND IN LIFE?"
        className={field}
      />
      <textarea
        rows={3}
        value={row.script}
        disabled={locked}
        onChange={(e) => setRow({ ...row, script: e.target.value })}
        placeholder={`What Ray says (about ${ray.words} words for ${ray.seconds} seconds)`}
        className={`${field} resize-none`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-xs ${words(row.script) > ray.words + 2 ? 'text-red-400' : 'text-muted-foreground'}`}>
          {words(row.script)} words
        </span>
        {!locked ? (
          <>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => save(false)}>
              Save
            </Button>
            <Button size="sm" disabled={busy || !row.script.trim()} onClick={() => save(true)}>
              {busy ? 'Saving…' : 'Approve'}
            </Button>
          </>
        ) : null}
        {row.videoUrl ? (
          <a href={row.videoUrl} target="_blank" rel="noreferrer" className="text-xs underline">
            Watch video
          </a>
        ) : null}
        {row.results?.filter((r) => r.url).map((r) => (
          <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="text-xs underline">
            {r.id === 'youtube' ? 'YouTube' : 'Instagram'}
          </a>
        ))}
      </div>
      {row.error ? <p className="text-xs text-red-400">{row.error}</p> : null}
    </li>
  )
}

export default function RayBoard({ items, spend, cap, cost }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Last 7 days: ${spend.toFixed(2)} of ${cap} · about ${cost.toFixed(2)} a video
      </p>
      {items.length ? (
        <ul className="space-y-3">
          {items.map((item) => (
            <RayItem key={item.slug} item={item} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No cards on a Ray day (Mon, Wed, Sat) in the next two weeks.</p>
      )}
    </div>
  )
}
