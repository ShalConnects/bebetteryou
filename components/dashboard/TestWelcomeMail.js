'use client'

import { useState } from 'react'

export default function TestWelcomeMail({ emails }) {
  const [email, setEmail] = useState(emails[0] || '')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  async function onSend() {
    if (!email) return
    setBusy(true)
    setError('')
    setResult('')
    try {
      const res = await fetch('/api/newsletter/test-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setResult(`Test welcome sent to ${email}.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!emails.length) {
    return <p className="text-sm text-quiet">Add a subscriber first to test welcome mail.</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-0 flex-1 border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-paper/40"
          aria-label="Subscriber email"
        >
          {emails.map((row) => (
            <option key={row} value={row}>
              {row}
            </option>
          ))}
        </select>
        <button type="button" className="btn disabled:opacity-50" disabled={busy || !email} onClick={onSend}>
          {busy ? 'Sending…' : 'Send test welcome'}
        </button>
      </div>
      {result ? <p className="text-sm text-body">{result}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  )
}
