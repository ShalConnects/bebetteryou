'use client'

import { useState } from 'react'

export default function NotifySubscribers({ type, options }) {
  const [slug, setSlug] = useState(options[0]?.slug || '')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  async function onNotify() {
    if (!slug) return
    setBusy(true)
    setError('')
    setResult('')
    try {
      const res = await fetch('/api/newsletter/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, slug }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setResult(`Sent ${data.sent} of ${data.total} subscriber${data.total === 1 ? '' : 's'}.`)
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
