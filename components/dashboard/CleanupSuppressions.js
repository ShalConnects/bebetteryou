'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/** Admin: sync Resend bounce/complaint suppressions into unsubscribed leads. */
export default function CleanupSuppressions() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  async function onRun() {
    if (
      !window.confirm(
        'Unsubscribe everyone Resend has as bounced or complained (and any already in Bounces & spam)?'
      )
    ) {
      return
    }
    setBusy(true)
    setError('')
    setResult('')
    try {
      const res = await fetch('/api/newsletter/cleanup-suppressions', {
        method: 'POST',
        credentials: 'same-origin',
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

      setResult(
        [
          `Resend bad addresses: ${data.resendCount}`,
          `Local events: ${data.localCount}`,
          `Newly unsubscribed: ${data.unsubscribed}`,
          `Already unsubscribed: ${data.already}`,
          `Not on our list: ${data.missing}`,
        ].join(' · ')
      )
      router.refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-quiet">
        Pull Resend’s bounce/complaint suppressions and mark those emails unsubscribed here so we
        don’t mail them again.
      </p>
      <button type="button" className="btn disabled:opacity-50" disabled={busy} onClick={onRun}>
        {busy ? 'Cleaning…' : 'Clean up bounced / complained'}
      </button>
      {result ? <p className="text-sm text-body">{result}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  )
}
