'use client'

import { useState } from 'react'

/** Email a single quote to the newsletter list (existing or just-saved). */
export default function EmailQuoteList({ slug }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  if (!slug) return null

  async function onSend() {
    setBusy(true)
    setError('')
    setResult('')
    try {
      const res = await fetch('/api/newsletter/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'quote', slug }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setResult(`Email ${data.sent} of ${data.total} sent`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-[0.2em] text-quiet">Newsletter</p>
      <button type="button" className="btn disabled:opacity-50" disabled={busy} onClick={onSend}>
        {busy ? 'Sending…' : 'Email list'}
      </button>
      {result ? <p className="text-sm text-body">{result}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  )
}
