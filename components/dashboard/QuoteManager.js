'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { quoteCard } from '@/config/quote-card'
import { filterQuotes } from '@/config/dashboard'
import { clampQuoteInput, quoteLinesOverflowMessage, quoteMetrics } from '@/libs/quote-text'
import { useQuotePreview } from '@/components/site/useQuotePreview'
import TagPicker from '@/components/site/TagPicker'
import SocialPost from '@/components/site/SocialPost'

const inputClass =
  'w-full border border-line bg-ink px-4 py-3 text-paper outline-none focus:border-paper/40'
const { maxChars, maxLines } = quoteCard.quote

export default function QuoteManager({ quotes: initial, tagOptions = [] }) {
  const [items, setItems] = useState(initial)
  const [q, setQ] = useState('')
  const [tag, setTag] = useState('')
  const [slug, setSlug] = useState(null)
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)
  const { preview, previewing, error, setError } = useQuotePreview(form?.text || '', form?.author || '')

  const filtered = useMemo(() => filterQuotes(items, { q, tag }), [items, q, tag])
  const current = items.find((x) => x.slug === slug)
  const chars = form ? quoteMetrics(form.text).chars : 0
  const lines = preview?.lines
  const overLines = Boolean(form && lines != null && lines > maxLines)

  function pick(quote) {
    setSlug(quote.slug)
    setForm({
      text: quote.text || '',
      author: quote.author || '',
      tags: quote.tags || [],
      theme: quote.theme || '',
      relatedBooks: (quote.related?.books || []).join(', '),
      relatedPosts: (quote.related?.posts || []).join(', '),
    })
    setError('')
  }

  function parseSlugs(raw) {
    return String(raw || '')
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }

  async function save(regenerate) {
    if (!slug || !form || overLines) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/quotes/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: form.text,
          author: form.author,
          tags: form.tags,
          theme: form.theme,
          related: {
            books: parseSlugs(form.relatedBooks),
            posts: parseSlugs(form.relatedPosts),
          },
          regenerate,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setItems((prev) => prev.map((x) => (x.slug === slug ? data : x)))
      setForm({
        text: data.text || '',
        author: data.author || '',
        tags: data.tags || [],
        theme: data.theme || '',
        relatedBooks: (data.related?.books || []).join(', '),
        relatedPosts: (data.related?.posts || []).join(', '),
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!slug || !confirm(`Delete #${current?.n}? This cannot be undone.`)) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/quotes/${slug}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setItems((prev) => prev.filter((x) => x.slug !== slug))
      setSlug(null)
      setForm(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-quiet">Search</span>
        <div className="flex gap-3">
          <div className="flex min-w-0 flex-1 items-center border border-line bg-ink focus-within:border-paper/40">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Text, author, or #"
              className="min-w-0 flex-1 bg-transparent px-4 py-3 text-paper outline-none"
            />
            <span className="shrink-0 px-4 text-sm text-quiet">
              {filtered.length} of {items.length}
            </span>
          </div>
          <Link href="/dashboard/quotes/new" className="btn flex shrink-0 items-center px-7 py-0">
            New quote
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => setTag('')} className={tag ? 'tag' : 'tag-active'}>
          All
        </button>
        {tagOptions.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTag(t)}
            className={tag === t ? 'tag-active' : 'tag'}
          >
            {t}
          </button>
        ))}
      </div>

      <ul className="max-h-64 divide-y divide-line overflow-y-auto border border-line">
        {filtered.map((quote) => (
          <li key={quote.slug}>
            <button
              type="button"
              onClick={() => pick(quote)}
              className={`flex w-full items-baseline justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-paper/5 ${
                slug === quote.slug ? 'bg-paper/5' : ''
              }`}
            >
              <div className="min-w-0">
                <span className="text-paper">#{quote.n}</span>
                {!quote.text ? <span className="ml-2 text-xs text-quiet">no text</span> : null}
                <p className="truncate text-sm text-body/85">{quote.text?.split('\n')[0] || '—'}</p>
              </div>
              <span className="shrink-0 text-xs text-quiet">{quote.author || '—'}</span>
            </button>
          </li>
        ))}
      </ul>

      {form && current ? (
        <div className="space-y-4 border border-line p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="heading-sm">Edit #{current.n}</h2>
            <Link href={`/quotes/${current.slug}`} className="nav-link">
              View on site
            </Link>
          </div>

          {current.src ? (
            <img src={current.src} alt={`Quote #${current.n}`} className="mx-auto max-h-48 w-auto border border-line" />
          ) : null}

          <label className="block">
            <span className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-quiet">
              <span>Quote</span>
              <span className={`normal-case tracking-normal${overLines ? ' text-red-400' : ''}`}>
                {chars}/{maxChars} · {lines ?? 0}/{maxLines}
              </span>
            </span>
            <textarea
              rows={4}
              maxLength={maxChars}
              value={form.text}
              onChange={(e) => setForm({ ...form, text: clampQuoteInput(e.target.value) })}
              className={`${inputClass} resize-none`}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-quiet">Author</span>
            <input
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
              placeholder="Optional"
              className={inputClass}
            />
          </label>

          <TagPicker options={tagOptions} value={form.tags} onChange={(tags) => setForm({ ...form, tags })} />

          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-quiet">
              Scripture theme (optional pin)
            </span>
            <input
              value={form.theme}
              onChange={(e) => setForm({ ...form, theme: e.target.value })}
              placeholder="e.g. perseverance — blank = from tags"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-quiet">
              Pin books (slugs)
            </span>
            <input
              value={form.relatedBooks}
              onChange={(e) => setForm({ ...form, relatedBooks: e.target.value })}
              placeholder="atomic-habits, cant-hurt-me"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-quiet">
              Pin posts (slugs)
            </span>
            <input
              value={form.relatedPosts}
              onChange={(e) => setForm({ ...form, relatedPosts: e.target.value })}
              placeholder="discipline-for-men"
              className={inputClass}
            />
          </label>

          {overLines ? (
            <p className="text-sm text-red-400">{quoteLinesOverflowMessage(lines)}</p>
          ) : null}
          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={busy || overLines || previewing} onClick={() => save(false)} className="btn disabled:opacity-50">
              Save
            </button>
            <button
              type="button"
              disabled={busy || !form.text.trim() || overLines || previewing}
              onClick={() => save(true)}
              className="btn disabled:opacity-50"
            >
              Save & regenerate
            </button>
            <button type="button" disabled={busy} onClick={remove} className="btn disabled:opacity-50">
              Delete
            </button>
          </div>

          {slug ? <SocialPost slug={slug} /> : null}
        </div>
      ) : (
        <p className="text-sm text-quiet">Select a quote to edit.</p>
      )}
    </div>
  )
}
