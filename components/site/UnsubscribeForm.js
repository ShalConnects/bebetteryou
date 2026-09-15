'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

const PREF_OPTIONS = [
  { id: 'quotes', label: 'Quote cards when we post' },
  { id: 'blog', label: 'New blog posts' },
  { id: 'books', label: 'New book picks' },
]

export default function UnsubscribeForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('t') || ''
  const [email, setEmail] = useState('')
  const [prefs, setPrefs] = useState({ quotes: true, blog: true, books: true })
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!token) {
        setError('Missing link. Use the manage link from your email.')
        setLoading(false)
        return
      }
      try {
        const res = await fetch(`/api/newsletter/prefs?t=${encodeURIComponent(token)}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Invalid link')
        if (cancelled) return
        setEmail(data.email)
        setPrefs(data.prefs)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [token])

  async function save(body) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch('/api/newsletter/prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      if (data.prefs) setPrefs(data.prefs)
      setMessage(data.unsubscribed ? 'You’re unsubscribed.' : 'Preferences saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-quiet">Loading…</p>
  }

  if (error && !email) {
    return <p className="text-sm text-red-400">{error}</p>
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <p className="text-sm text-quiet">{email}</p>
      <fieldset>
        <legend className="mb-3 text-[11px] uppercase tracking-[0.2em] text-quiet">Preferences</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {PREF_OPTIONS.map(({ id, label }) => (
            <label
              key={id}
              className="inline-flex cursor-pointer items-center gap-2 text-sm text-body"
            >
              <input
                type="checkbox"
                checked={Boolean(prefs[id])}
                onChange={() => setPrefs((p) => ({ ...p, [id]: !p[id] }))}
                className="size-4 shrink-0 accent-accent"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn" disabled={busy} onClick={() => save({ prefs })}>
          {busy ? '…' : 'Save'}
        </button>
        <button
          type="button"
          className="nav-link"
          disabled={busy}
          onClick={() => save({ unsubscribe: true })}
        >
          Unsubscribe from all
        </button>
      </div>
      {message ? <p className="text-sm text-body">{message}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  )
}
