'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { traditions } from '@/config/traditions'
import { quoteCard } from '@/config/quote-card'
import { quoteShowsScripture, scriptureFor } from '@/libs/scripture-core'
import { clampQuoteInput, quoteLinesOverflowMessage, quoteMetrics } from '@/libs/quote-text'
import SocialPost from './SocialPost'
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

export default function QuoteForm({ nextN, tagOptions = [], themeOptions = [] }) {
  const [text, setText] = useState('')
  const [author, setAuthor] = useState('')
  const [tags, setTags] = useState([])
  const [theme, setTheme] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const { preview, previewing, error, setError } = useQuotePreview(text, author)

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
      setText('')
      setAuthor('')
      setTags([])
      setTheme('')
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
            onChange={(e) => setText(clampQuoteInput(e.target.value))}
            placeholder={"Line one\nLine two"}
            className={`${inputClass} resize-none`}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-quiet">Author</span>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Optional"
            className={inputClass}
          />
        </label>

        <TagPicker options={tagOptions} value={tags} onChange={setTags} />

        {themeOptions.length ? (
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-quiet">
              Scripture theme
            </span>
            <select value={theme} onChange={(e) => setTheme(e.target.value)} className={inputClass}>
              <option value="">From tags</option>
              {themeOptions.map((o) => (
                <option key={o.theme} value={o.theme}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <ScripturePreview tags={tags} theme={theme || undefined} seed={seed} />

        {overLines ? (
          <p className="text-sm text-red-400">{quoteLinesOverflowMessage(lines)}</p>
        ) : null}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {result ? (
          <p className="text-sm text-body">
            Saved{' '}
            <Link href={`/quotes/${result.slug}`} className="text-paper underline">
              #{result.n}
            </Link>
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy || !text.trim() || overLines || previewing}
          className="btn disabled:opacity-50"
        >
          {busy ? 'Generating…' : 'Generate & save'}
        </button>

        {result?.slug ? <SocialPost slug={result.slug} /> : null}
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
