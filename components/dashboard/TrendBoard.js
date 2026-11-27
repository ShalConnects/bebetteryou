'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/dashboard/toast'

const field = 'w-full border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-paper/40'
const tone = { draft: 'warn', approved: 'default', posted: 'default', skipped: 'muted' }
const label = { draft: 'Needs approval', approved: 'Approved — posts 11 pm', posted: 'Posted', skipped: 'Skipped' }
const day = (date) => new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

/** POST a trend action; returns the API's `trend` result or toasts the error. */
async function send(body) {
  const res = await fetch('/api/social/post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trend: true, ...body }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed')
  return data.trend
}

function TrendItem({ item, today }) {
  const [row, setRow] = useState(item)
  const [busy, setBusy] = useState(false)
  const open = row.date === today && !['posted'].includes(row.status)

  async function act(action) {
    setBusy(true)
    try {
      setRow({ ...row, ...(await send({ date: row.date, text: row.text, action })) })
      toast({ approve: 'Approved', skip: 'Skipped' }[action] || 'Saved')
    } catch (err) {
      toast(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="grid gap-4 border border-line p-4 sm:grid-cols-[160px_1fr]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={row.src} alt="" className="w-full border border-line" />
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-paper">
            {day(row.date)} · trending on {row.source}: <span className="text-muted-foreground">{row.topic}</span> · #{row.hashtag}
          </p>
          <Badge variant={tone[row.status]}>{label[row.status]}</Badge>
        </div>
        <textarea rows={3} value={row.text} disabled={!open} onChange={(e) => setRow({ ...row, text: e.target.value })} className={field} />
        {open ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => act('save')}>Save edit</Button>
            <Button size="sm" disabled={busy} onClick={() => act('approve')}>{busy ? 'Saving…' : 'Approve'}</Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => act('skip')}>Skip</Button>
          </div>
        ) : null}
        {row.error ? <p className="text-xs text-red-400">{row.error}</p> : null}
      </div>
    </li>
  )
}

export default function TrendBoard({ rows, today, alerts }) {
  const [linked, setLinked] = useState(alerts)
  const [items, setItems] = useState(rows)
  const [drafting, setDrafting] = useState(false)

  async function draft() {
    setDrafting(true)
    try {
      const row = await send({ action: 'draft' })
      if (row.skipped) throw new Error(`No draft: ${row.reason}${row.tried ? ` (${row.tried.join('; ')})` : ''}`)
      setItems([row, ...items])
    } catch (err) {
      toast(err.message)
    } finally {
      setDrafting(false)
    }
  }

  async function link() {
    try {
      toast(`Alerts go to ${(await send({ action: 'link' })).name} on Telegram`)
      setLinked(true)
    } catch (err) {
      toast(err.message)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {linked ? 'Telegram alerts are on: each draft is sent to you at 8 pm. ' : 'Message your Telegram bot once, then '}
        <button type="button" onClick={link} className="underline">{linked ? 'Relink' : 'link Telegram alerts'}</button>
      </p>
      {items[0]?.date !== today ? (
        <Button size="sm" variant="outline" disabled={drafting} onClick={draft}>
          {drafting ? 'Reading trends…' : 'Draft now'}
        </Button>
      ) : null}
      {items.length ? (
        <ul className="space-y-3">
          {items.map((row) => (
            <TrendItem key={row.date} item={row} today={today} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No trend cards yet. The first is drafted at 8 pm (not on Fridays).</p>
      )}
    </div>
  )
}
