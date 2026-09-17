'use client'

import { useState } from 'react'

/** Send the newest 6 public cards to quote subscribers. */
export default function DigestNotify() {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  async function onSend() {
    if (!window.confirm('Email the latest 6 cards to all quote subscribers?')) return
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
      setResult(
        `Digest (${data.quotes || 0} cards): emailed ${data.sent} of ${data.total} subscriber${data.total === 1 ? '' : 's'}.`
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-quiet">
        Prefer this over emailing every new card. For Resend Broadcasts, paste the same six cards into an Audience
        campaign — this button uses the site list via Resend transactional mail.
      </p>
      <button type="button" className="btn disabled:opacity-50" disabled={busy} onClick={onSend}>
        {busy ? 'Sending…' : 'Send 6-card digest'}
      </button>
      {result ? <p className="text-sm text-body">{result}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  )
}
