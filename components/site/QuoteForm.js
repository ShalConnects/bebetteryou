'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { traditions } from '@/config/traditions'
import { quoteCard } from '@/config/quote-card'
import { quoteShowsScripture, scriptureFor } from '@/libs/scripture-core'
import { clampQuoteInput, findDuplicateQuote, quoteFingerprint, quoteLinesOverflowMessage, quoteMetrics } from '@/libs/quote-text'
import { suggestQuoteLane } from '@/libs/quote-suggest'
import SocialPost from './SocialPost'
import ThemeSelect from './ThemeSelect'
import EmailQuoteList from '@/components/dashboard/EmailQuoteList'
import TagPicker from './TagPicker'
import { useQuotePreview } from './useQuotePreview'

const { maxChars, maxLines } = quoteCard.quote
const traditionOptions = traditions.filter((t) => t.id !== 'none')
const inputClass = 'w-full border border-line bg-ink px-4 py-3 text-paper outline-none focus:border-paper/40'

function ScripturePreview({ tags, theme, seed }) {
  const [book, setBook] = useState(null)
  const [map, setMap] = useState(null)

  useEffect(() => {
    let alive = true
    fetch('/api/scripture')
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return
        setBook(d.data || null)
        setMap(d.themes || null)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const rows = useMemo(() => {
    if (!quoteShowsScripture(tags, theme, map)) return []
    return traditionOptions.map(({ id, label }) => ({
      id,
      label,
      entry: book ? scriptureFor(book, id, tags, seed, null, theme, map) : null,
    }))
  }, [book, map, tags, theme, seed])

  if (!rows.length) return null

  return (
    <div className="space-y-2 border border-line p-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-quiet">Scripture preview</p>
      {rows.map(({ id, label, entry }) => (
        <p key={id} className="text-xs text-quiet">
          <span className="text-paper">{label}</span>
          {entry ? ` · ${entry.ref}` : ' · —'}
        </p>
      ))}
    </div>
  )
}

function sameList(a, b) {
  return a.length === b.length && a.every((item, i) => item === b[i])
}

function sameDraft(previous, next) {
  const left = previous.trim().toLowerCase()
  const right = next.trim().toLowerCase()
  return Boolean(left && right && (left.startsWith(right) || right.startsWith(left)))
}

function reviewItem(text, suggestion) {
  return {
    id: quoteFingerprint(text),
    text: text.trim(),
    tags: suggestion.review.map((row) => row.tag),
    theme: suggestion.review[0]?.theme || '',
    suggestions: suggestion.review,
  }
}

function upsertReview(queue, text, suggestion) {
  const item = reviewItem(text, suggestion)
  if (!item.id) return queue
  const last = queue[queue.length - 1]
  const rest = last && sameDraft(last.text, item.text) ? queue.slice(0, -1) : queue.filter((row) => row.id !== item.id)
  return [...rest, item].slice(-8)
}

function percent(confidence) {
  return `${Math.round(confidence * 100)}%`
}

function ReviewQueue({ items, onAccept, onDismiss }) {
  if (!items.length) return null
  return (
    <div className="space-y-3 border border-line p-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-quiet">Review queue</p>
      {items.map((item) => (
        <div key={item.id} className="space-y-2">
          <p className="text-sm text-paper">{item.text}</p>
          {item.suggestions.length ? (
            <p className="text-xs text-quiet">
              {item.suggestions.map((row) => `${row.tag} ${percent(row.confidence)}`).join(' · ')}
              {item.theme ? ` · ${item.theme}` : ''}
            </p>
          ) : (
            <p className="text-xs text-quiet">No close tag in the library. Choose tags yourself.</p>
          )}
          <div className="flex gap-4">
            {item.tags.length ? (
              <button type="button" className="text-sm text-paper underline" onClick={() => onAccept(item)}>
                Use these tags
              </button>
            ) : null}
            <button type="button" className="text-sm text-quiet underline" onClick={() => onDismiss(item.id)}>
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function QuoteForm({
  nextN,
  tagOptions = [],
  tagCatalog = [],
  trainingQuotes = [],
  themeOptions = [],
  catalog = [],
  postDate,
}) {
  const [text, setText] = useState('')
  const [author, setAuthor] = useState('')
  const [tags, setTags] = useState([])
  const [theme, setTheme] = useState('')
  const [reviewQueue, setReviewQueue] = useState([])
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [authorLookup, setAuthorLookup] = useState(false)
  const [authorNote, setAuthorNote] = useState('')
  const pinned = useRef(false)
  const pasted = useRef(false)
  const authorEdited = useRef(false)
  const textRef = useRef('')
  const lookupSeq = useRef(0)
  const { preview, previewing, error, setError } = useQuotePreview(text, author, tags)
  const duplicate = useMemo(() => findDuplicateQuote(catalog, text), [catalog, text])
  const lanes = tagCatalog.length ? tagCatalog : tagOptions.map((name) => ({ name }))

  function applySuggestion(nextText, { force = false } = {}) {
    if (pinned.current && !force) return
    const suggestion = suggestQuoteLane(nextText, lanes, trainingQuotes)
    if (suggestion.needsReview) {
      setTags((prev) => (prev.length ? [] : prev))
      setTheme((prev) => (prev ? '' : prev))
      setReviewQueue((prev) => upsertReview(prev, nextText, suggestion))
      return
    }
    setTags((prev) => (sameList(prev, suggestion.tags) ? prev : suggestion.tags))
    setTheme((prev) => (prev === suggestion.theme ? prev : suggestion.theme))
    const id = quoteFingerprint(nextText)
    setReviewQueue((prev) => (prev.some((row) => row.id === id) ? prev.filter((row) => row.id !== id) : prev))
  }

  function acceptReview(item) {
    pinned.current = true
    setText(item.text)
    setTags(item.tags)
    setTheme(item.theme)
    setReviewQueue((prev) => prev.filter((row) => row.id !== item.id))
  }

  function dismissReview(id) {
    setReviewQueue((prev) => prev.filter((row) => row.id !== id))
  }

  function onQuoteChange(e) {
    const next = clampQuoteInput(e.target.value)
    const fromPaste = pasted.current
    pasted.current = false
    textRef.current = next
    setText(next)
    if (!next.trim()) {
      pinned.current = false
      authorEdited.current = false
      lookupSeq.current += 1
      setAuthorLookup(false)
      setAuthorNote('')
      setAuthor('')
      setTags([])
      setTheme('')
      return
    }
    applySuggestion(next)
    if (fromPaste) lookupAuthor(next)
  }

  function lookupAuthor(quote) {
    if (authorEdited.current) return
    const seq = lookupSeq.current + 1
    lookupSeq.current = seq
    setAuthorNote('')
    setAuthorLookup(true)
    fetch('/api/quotes/author', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: quote }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (seq !== lookupSeq.current || authorEdited.current || textRef.current !== quote) return
        const name = typeof data?.author === 'string' ? data.author : ''
        setAuthor(name)
        setAuthorNote(name ? '' : 'No author found for this line.')
      })
      .catch(() => {
        if (seq === lookupSeq.current) setAuthorNote('No author found for this line.')
      })
      .finally(() => {
        if (seq === lookupSeq.current) setAuthorLookup(false)
      })
  }

  function onTagsChange(next) {
    pinned.current = true
    setTags(next)
  }

  function onThemeChange(e) {
    pinned.current = true
    setTheme(e.target.value)
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (preview?.lines > maxLines) return
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, author, tags, theme }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setResult(data)
      pinned.current = false
      authorEdited.current = false
      textRef.current = ''
      lookupSeq.current += 1
      setAuthorLookup(false)
      setAuthorNote('')
      setText('')
      setAuthor('')
      setTags([])
      setTheme('')
      setReviewQueue((prev) => prev.filter((row) => row.text.trim() !== text.trim()))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const cardN = preview?.n ?? (result ? result.n + 1 : nextN)
  const imageSrc = preview?.dataUrl ?? result?.src ?? null
  const imageN = preview?.n ?? result?.n ?? null
  const imageMode = preview?.dataUrl ? 'preview' : result ? 'saved' : null
  const generating = previewing || busy
  const { chars } = quoteMetrics(text)
  const lines = preview?.lines
  const overLines = lines != null && lines > maxLines
  const seed = `bby-${cardN}`

  return (
    <form
      onSubmit={onSubmit}
      className="grid w-full grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-12"
    >
      <div className="space-y-5">
        <p className="text-sm text-quiet">Next card: #{cardN}</p>

        <label className="block">
          <span className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-quiet">
            <span>Quote</span>
            <span className={`normal-case tracking-normal${overLines ? ' text-red-400' : ''}`}>
              {chars}/{maxChars} · {lines ?? 0}/{maxLines}
            </span>
          </span>
          <textarea
            required
            rows={6}
            maxLength={maxChars}
            value={text}
            onPaste={() => {
              pinned.current = false
              pasted.current = true
            }}
            onChange={onQuoteChange}
            placeholder={"Line one\nLine two"}
            className={`${inputClass} resize-none`}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-quiet">Author</span>
          <input
            value={author}
            onChange={(e) => {
              authorEdited.current = true
              setAuthorNote('')
              setAuthor(e.target.value)
            }}
            placeholder="Optional"
            className={inputClass}
          />
          {authorLookup ? <span className="mt-2 block text-sm text-quiet">Looking up the author…</span> : null}
          {!authorLookup && authorNote ? <span className="mt-2 block text-sm text-quiet">{authorNote}</span> : null}
        </label>

        <TagPicker options={tagOptions} value={tags} onChange={onTagsChange} />

        <ReviewQueue items={reviewQueue} onAccept={acceptReview} onDismiss={dismissReview} />

        {themeOptions.length ? (
          <ThemeSelect value={theme} onChange={onThemeChange} options={themeOptions} />
        ) : null}

        <ScripturePreview tags={tags} theme={theme || undefined} seed={seed} />

        {overLines ? (
          <p className="text-sm text-red-400">{quoteLinesOverflowMessage(lines)}</p>
        ) : null}
        {duplicate ? (
          <p className="text-sm text-amber-300">
            Already{' '}
            <Link href={`/quotes/${duplicate.slug}`} className="underline">
              #{duplicate.n}
            </Link>
            — you can still save.
          </p>
        ) : null}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {result ? (
          <p className="text-sm text-body">
            Saved #{result.n} as draft — not on the site until you Post now or a schedule goes live.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy || !text.trim() || overLines || previewing}
          className="btn disabled:opacity-50"
        >
          {busy ? 'Generating…' : 'Generate & save'}
        </button>

        {result?.slug ? <SocialPost slug={result.slug} postDate={postDate} /> : null}
        {result?.slug ? <EmailQuoteList slug={result.slug} /> : null}
      </div>

      <div>
        {imageSrc ? (
          <div className="mx-auto w-full max-w-[18rem] sm:max-w-[22rem] md:max-w-none">
            <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-quiet">
              {imageMode === 'preview' ? `Preview #${imageN}` : `Saved #${imageN}`}
              {previewing ? ' · updating…' : ''}
            </p>
            <img
              src={imageSrc}
              alt={imageMode === 'preview' ? `Preview #${imageN}` : `Quote #${imageN}`}
              className="w-full border border-line"
            />
          </div>
        ) : (
          <div className="mx-auto flex aspect-[4/5] w-full max-w-[18rem] items-center justify-center border border-dashed border-line sm:max-w-[22rem] md:max-w-none">
            <p className="px-6 text-center text-sm text-quiet">
              {generating ? 'Generating card…' : 'Type a quote to preview'}
            </p>
          </div>
        )}
      </div>
    </form>
  )
}
