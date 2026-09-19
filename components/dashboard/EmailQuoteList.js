'use client'

import { useState } from 'react'

/** Optional: email one quote to a random batch of 100 (30-day cooldown). */
export default function EmailQuoteList({ slug }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  if (!slug) return null

  async function onSend() {
    if (
      !window.confirm(
        'Email this card to up to 100 quote subscribers who have not gotten quote mail in 30 days?'
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
        body: JSON.stringify({ type: 'quote', slug }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
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

  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-[0.2em] text-quiet">Newsletter</p>
      <button type="button" className="btn disabled:opacity-50" disabled={busy} onClick={onSend}>
        {busy ? 'Sending…' : 'Email this card'}
      </button>
      {result ? <p className="text-sm text-body">{result}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  )
}
