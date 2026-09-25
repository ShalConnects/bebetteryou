'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

/** Manual Friday publish for the Sat–Thu quote window. Preview is dry-run only. */
export default function WeekReview({ quotes: quotesProp = [], range, mode = 'dated' }) {
  const quotes = Array.isArray(quotesProp) ? quotesProp : []
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [log, setLog] = useState([])
  const [preview, setPreview] = useState(null)
  const [shortUrl, setShortUrl] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const from = range?.start?.slice?.(0, 10) || ''
  const to = range?.end?.slice?.(0, 10) || ''
  const empty = quotes.length === 0

  function trace(msg, extra) {
    const line = extra != null ? `${msg} ${typeof extra === 'string' ? extra : JSON.stringify(extra)}` : msg
    console.log(`[week-review] ${msg}`, extra ?? '')
    setStatus(msg)
    setLog((prev) => [...prev.slice(-12), `${new Date().toLocaleTimeString()} · ${line}`])
  }

  useEffect(() => {
    console.log('[week-review] mount', { count: quotes.length, mode, from, to, slugs: quotes.map((q) => q.slug) })
  }, [quotes, mode, from, to])

  useEffect(() => {
    return () => {
      if (shortUrl) URL.revokeObjectURL(shortUrl)
    }
  }, [shortUrl])

  async function onPreview(e) {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    console.log('[week-review] Preview clicked', { empty, count: quotes.length, busy })
    if (empty) {
      setError('Nothing to preview — no cards loaded for this window.')
      trace('Blocked: empty quote list')
      return
    }
    setBusy(true)
    setError('')
    setResult(null)
    setPreview(null)
    try {
      trace('1/2 Fetching collage preview…', { count: quotes.length, mode })
      const res = await fetch('/api/quotes/week-review?preview=1')
      const data = await res.json().catch(() => ({}))
      console.log('[week-review] collage response', { ok: res.ok, status: res.status, data })
      if (!res.ok) throw new Error(data.reason || data.error || `Preview failed (${res.status})`)
      setPreview(data)
      trace(`1/2 Collage ok (${data.quotes?.length || 0} cards, ${data.collage || 'no file'})`)

      trace('2/2 Encoding Short (can take ~30s)…')
      const shortRes = await fetch('/api/quotes/week-review?preview=1&part=short')
      console.log('[week-review] short response', {
        ok: shortRes.ok,
        status: shortRes.status,
        type: shortRes.headers.get('content-type'),
      })
      if (!shortRes.ok) {
        const err = await shortRes.json().catch(() => ({}))
        throw new Error(err.error || `Short preview failed (${shortRes.status})`)
      }
      const blob = await shortRes.blob()
      console.log('[week-review] short blob', { bytes: blob.size, type: blob.type })
      const url = URL.createObjectURL(blob)
      setShortUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
      trace('Done — collage + Short ready.')
    } catch (err) {
      console.error('[week-review] preview failed', err)
      setError(err.message || String(err))
      setStatus('')
      setLog((prev) => [...prev, `${new Date().toLocaleTimeString()} · ERROR ${err.message}`])
    } finally {
      setBusy(false)
    }
  }

  async function onPublish(e) {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    if (empty) {
      setError('Nothing to publish in this window.')
      return
    }
    const recentNote =
      mode === 'recent'
        ? '\n\nNote: Sat–Thu window was empty — this uses newest cards (preview fallback).'
        : ''
    if (
      !window.confirm(
        `Publish week in review for ${quotes.length} card(s) (${from} → ${to})?\n\nCollage → IG/FB/Bluesky/Telegram/Pinterest\nShort → YouTube\nThread → Threads\nDigest → email${recentNote}`
      )
    ) {
      return
    }
    setBusy(true)
    setError('')
    setStatus('')
    setResult(null)
    try {
      trace('Publishing week in review…')
      const res = await fetch('/api/quotes/week-review', { method: 'POST' })
      const data = await res.json()
      console.log('[week-review] publish response', { ok: res.ok, status: res.status, data })
      if (!res.ok) throw new Error(data.reason || data.error || 'Failed')
      setResult(data)
      trace('Publish finished.')
    } catch (err) {
      console.error('[week-review] publish failed', err)
      setError(err.message)
      setStatus('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-quiet">
        Window: Saturday {from} → Thursday {to}. Loaded <span className="text-paper">{quotes.length}</span> card
        {quotes.length === 1 ? '' : 's'}
        {mode === 'posted'
          ? ' (posted to social in Sat–Thu).'
          : mode === 'posted-all'
            ? ' (all cards ever posted to social — none in this Sat–Thu window).'
            : mode === 'recent'
              ? ' (newest fallback).'
              : ' (dated Sat–Thu).'}{' '}
        Preview never posts or emails. Collage file opens below after preview.
      </p>

      {quotes.length ? (
        <ul className="space-y-2 border border-line divide-y divide-line">
          {quotes.map((q) => (
            <li key={q.slug} className="flex items-start justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.2em] text-quiet">#{q.n}</p>
                <p className="mt-1 text-sm text-paper line-clamp-2">{q.text}</p>
              </div>
              <Link href={`/quotes/${q.slug}`} className="shrink-0 text-sm text-quiet hover:text-paper">
                View
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-quiet">No quotes available to preview.</p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          className="btn disabled:opacity-50"
          disabled={busy}
          onClick={onPreview}
        >
          {busy ? 'Working…' : 'Preview (no publish)'}
        </button>
        <button type="button" className="btn disabled:opacity-50" disabled={busy || empty} onClick={onPublish}>
          {busy ? 'Working…' : 'Publish week in review'}
        </button>
      </div>

      {status ? <p className="text-sm text-paper">{status}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {log.length ? (
        <pre className="max-h-40 overflow-auto border border-line bg-ink p-3 text-xs text-quiet whitespace-pre-wrap">
          {log.join('\n')}
        </pre>
      ) : null}

      {preview ? (
        <div className="space-y-4 border border-line p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-quiet">Dry run</p>
          {preview.collage ? (
            <div className="space-y-2">
              <p className="text-sm text-quiet">
                Collage JPG:{' '}
                <a href={preview.collage} className="text-paper underline" target="_blank" rel="noreferrer">
                  {preview.collage}
                </a>{' '}
                ({preview.quotes?.length || 0} cards in a grid — this is what IG/FB/Bluesky/Telegram/Pinterest get)
              </p>
              <img
                src={`${preview.collage}?t=${Date.now()}`}
                alt="Week collage preview"
                className="max-h-[28rem] w-auto border border-line bg-ink"
              />
            </div>
          ) : null}
          {shortUrl ? (
            <video
              src={shortUrl}
              controls
              playsInline
              className="max-h-80 w-auto border border-line bg-ink"
            />
          ) : null}
          {preview.caption ? (
            <pre className="whitespace-pre-wrap text-sm text-body">{preview.caption}</pre>
          ) : null}
          {preview.plan?.length ? (
            <ul className="space-y-1 text-sm text-quiet">
              {preview.plan.map((row) => (
                <li key={row.id}>
                  {row.label}: {row.via}
                  {row.ready ? '' : ' (not configured — would skip)'}
                </li>
              ))}
              <li>Email: digest template (not sent in preview)</li>
            </ul>
          ) : null}
        </div>
      ) : null}

      {result?.results ? (
        <ul className="space-y-1 text-sm text-quiet">
          {result.results.map((row) => (
            <li key={row.id}>
              {row.label || row.id}:{' '}
              {row.ok ? (
                row.url ? (
                  <a href={row.url} className="text-paper underline" target="_blank" rel="noreferrer">
                    posted
                  </a>
                ) : (
                  <span className="text-paper">ok</span>
                )
              ) : (
                <span className="text-red-400">{row.error || 'failed'}</span>
              )}
            </li>
          ))}
          {result.email ? (
            <li>
              Email: sent {result.email.sent ?? 0}
              {result.email.error ? ` · ${result.email.error}` : ''}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}
