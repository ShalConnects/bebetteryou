'use client'

import { useRef, useState } from 'react'
import SurpriseMood from '@/components/site/SurpriseMood'
import { copy } from '@/config/site'

const DEFAULT_PREFS = { quotes: true, blog: true, books: true }

const PREF_OPTIONS = [
  { id: 'quotes', label: 'Quotes' },
  { id: 'blog', label: 'Blog' },
  { id: 'books', label: 'Books' },
]

export default function NewsletterForm({ quotes, moods = [], compact = false }) {
  const dialogRef = useRef(null)
  const [email, setEmail] = useState('')
  const [prefs, setPrefs] = useState(DEFAULT_PREFS)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const surprise = quotes?.length ? (
    <button type="button" className="btn flex-1 sm:flex-none" onClick={() => dialogRef.current?.showModal()}>
      Surprise Me
    </button>
  ) : null

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, prefs }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setDone(true)
      setEmail('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function onDialogClick(e) {
    if (e.target === e.currentTarget) e.currentTarget.close()
  }

  function togglePref(id) {
    setPrefs((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <>
      {done ? (
        <div
          className={`flex flex-col gap-4 ${
            compact ? 'mt-5 items-start' : 'mt-8 items-center sm:flex-row sm:justify-center'
          }`}
        >
          <p className="text-sm text-body">You&apos;re on the list.</p>
          {surprise}
        </div>
      ) : (
        <form onSubmit={onSubmit} className={`space-y-4 ${compact ? 'mt-5' : 'mt-8'}`}>
          <div className={`flex flex-col gap-3 ${compact ? '' : 'sm:flex-row'}`}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hello@shalconnects.com"
              aria-label="Email"
              className="min-w-0 flex-1 border border-line bg-ink px-4 py-3 text-paper outline-none placeholder:text-quiet/45 focus:border-paper/40"
            />
            <div className={`flex gap-3 ${compact ? '' : 'sm:contents'}`}>
              <button type="submit" disabled={busy} className="btn flex-1 disabled:opacity-50 sm:flex-none">
                {busy ? '…' : 'Subscribe'}
              </button>
              {surprise}
            </div>
          </div>
          <fieldset
            className={`flex flex-nowrap items-center gap-x-4 gap-y-2 ${compact ? 'justify-start' : 'justify-center'}`}
          >
            <legend className="sr-only">Email preferences</legend>
            {PREF_OPTIONS.map(({ id, label }) => (
              <label
                key={id}
                className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-quiet sm:gap-2 sm:text-sm"
              >
                <input
                  type="checkbox"
                  checked={prefs[id]}
                  onChange={() => togglePref(id)}
                  className="size-4 shrink-0 accent-accent"
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </form>
      )}

      {quotes?.length ? (
        <dialog
          ref={dialogRef}
          aria-label={copy.surpriseTitle}
          className="fixed inset-0 z-50 m-0 h-full max-h-full w-full max-w-full bg-transparent p-4 open:flex open:items-center open:justify-center open:overflow-y-auto sm:p-6 backdrop:bg-ink/70 backdrop:backdrop-blur-sm"
          onClick={onDialogClick}
        >
          <div className="relative my-auto w-full max-w-5xl border border-line/40 bg-ink p-6 pt-12 shadow-[0_24px_64px_rgba(0,0,0,0.55)] md:p-10 md:pt-14">
            <button
              type="button"
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center text-quiet transition-colors hover:text-paper md:right-4 md:top-4"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <SurpriseMood quotes={quotes} moods={moods} />
          </div>
        </dialog>
      ) : null}
    </>
  )
}
