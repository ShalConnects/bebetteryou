'use client'

import { useState } from 'react'

function channelLabel(type) {
  if (type === 'blog') return 'blog'
  if (type === 'book') return 'book'
  return 'quote'
}

export default function NotifySubscribers({ type, options }) {
  const [slug, setSlug] = useState(options[0]?.slug || '')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  const channel = channelLabel(type)

  async function onNotify() {
    if (!slug) return
    if (
      !window.confirm(
        `Email this to up to 100 ${channel} subscribers who have not gotten ${channel} mail in 30 days?`
      )
    ) {
      return
    }
    setBusy(true)
    setError('')
    setResult('')
    try {
      const res = await fetch('/api/newsletter/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ type, slug }),
      })
      const raw = await res.text()
      let data = {}
      try {
        data = raw ? JSON.parse(raw) : {}
      } catch {
        throw new Error(
          raw?.trim()?.slice(0, 160) || `Request failed (${res.status}) — non-JSON response`
        )
      }
      if (!res.ok) throw new Error(data.error || `Failed (${res.status})`)

      const bits = [`Sent ${data.sent} of ${data.total}`]
      if (data.failed) bits.push(`${data.failed} failed (still on cooldown)`)
      if (data.eligible != null) bits.push(`${data.eligible} were eligible`)
      setResult(bits.join(' · '))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!options.length) {
    return <p className="text-sm text-quiet">Nothing to notify yet.</p>
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-quiet">
        Up to 100 random eligible subscribers per send (30-day cooldown for this channel).
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="dash-select min-w-0 flex-1 py-2.5 text-sm leading-tight"
          aria-label={
            type === 'blog' ? 'Blog post' : type === 'book' ? 'Book' : 'Quote'
          }
        >
          {options.map((row) => (
            <option key={row.slug} value={row.slug}>
              {row.label}
            </option>
          ))}
        </select>
        <button type="button" className="btn disabled:opacity-50" disabled={busy || !slug} onClick={onNotify}>
          {busy ? 'Sending…' : 'Notify subscribers'}
        </button>
      </div>
      {result ? <p className="text-sm text-body">{result}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  )
}
