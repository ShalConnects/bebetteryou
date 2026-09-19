'use client'

import { useState } from 'react'

/** Send the newest 6 public cards to a random batch of 100 (30-day cooldown). */
export default function DigestNotify() {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  async function onSend() {
    if (
      !window.confirm(
        'Email the latest 6 cards to up to 100 quote subscribers who have not gotten quote mail in 30 days?'
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
        body: JSON.stringify({ type: 'digest' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      const bits = [
        `Digest (${data.quotes || 0} cards): sent ${data.sent} of ${data.total}`,
      ]
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
    <div className="space-y-3">
      <p className="text-sm text-quiet">
        Random batch of up to 100 eligible subscribers (shared 30-day cooldown with single-card sends). Failures
        still count toward cooldown and appear below.
      </p>
      <button type="button" className="btn disabled:opacity-50" disabled={busy} onClick={onSend}>
        {busy ? 'Sending…' : 'Send 6-card digest'}
      </button>
      {result ? <p className="text-sm text-body">{result}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  )
}
