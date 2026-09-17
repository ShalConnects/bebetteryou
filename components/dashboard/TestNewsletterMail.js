'use client'

import { useMemo, useState } from 'react'

const TYPES = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'quote', label: 'Quote' },
  { id: 'blog', label: 'Blog' },
  { id: 'book', label: 'Book' },
]

const selectClass = 'dash-select min-w-0 flex-1 py-2.5 text-sm leading-tight'

export default function TestNewsletterMail({ emails, quotes = [], posts = [], books = [] }) {
  const [email, setEmail] = useState(emails[0] || '')
  const [type, setType] = useState('welcome')
  const [slug, setSlug] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  const options = useMemo(() => {
    if (type === 'quote') return quotes
    if (type === 'blog') return posts
    if (type === 'book') return books
    return []
  }, [type, quotes, posts, books])

  const needsSlug = type !== 'welcome'
  const effectiveSlug = slug && options.some((o) => o.slug === slug) ? slug : options[0]?.slug || ''

  async function onSend() {
    if (!email) return
    if (needsSlug && !effectiveSlug) {
      setError('Pick an item for this template.')
      return
    }
    setBusy(true)
    setError('')
    setResult('')
    try {
      const res = await fetch('/api/newsletter/test-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          type,
          ...(needsSlug ? { slug: effectiveSlug } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setResult(`Test ${type} sent to ${email}.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!emails.length) {
    return <p className="text-sm text-quiet">Add a subscriber first to send a test email.</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <select
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={selectClass}
          aria-label="Subscriber email"
        >
          {emails.map((row) => (
            <option key={row} value={row}>
              {row}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value)
            setSlug('')
          }}
          className={selectClass}
          aria-label="Email template"
        >
          {TYPES.map((row) => (
            <option key={row.id} value={row.id}>
              {row.label}
            </option>
          ))}
        </select>
        {needsSlug ? (
          <select
            value={effectiveSlug}
            onChange={(e) => setSlug(e.target.value)}
            className={selectClass}
            aria-label="Item"
            disabled={!options.length}
          >
            {!options.length ? (
              <option value="">Nothing available</option>
            ) : (
              options.map((row) => (
                <option key={row.slug} value={row.slug}>
                  {row.label}
                </option>
              ))
            )}
          </select>
        ) : null}
        <button
          type="button"
          className="btn disabled:opacity-50"
          disabled={busy || !email || (needsSlug && !effectiveSlug)}
          onClick={onSend}
        >
          {busy ? 'Sending…' : 'Send test'}
        </button>
      </div>
      {result ? <p className="text-sm text-body">{result}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  )
}
