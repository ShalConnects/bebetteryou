'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { bindFocusTrap } from '@/libs/focus-trap'
import { SEARCH_MIN_LEN, searchHref } from '@/libs/search-url'
import { useTradition } from './TraditionProvider'

const TIP_SHOW_MS = 800
/** Ring finishes ~0.85s; keep the copy on screen for 2.5s after that. */
const TIP_COPY_DELAY_MS = 850
const TIP_COPY_HOLD_MS = 2500
const TIP_HOLD_MS = TIP_COPY_DELAY_MS + TIP_COPY_HOLD_MS
const TIP_OUT_MS = 320

function SearchIcon({ className = '' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function ResultRow({ item, onPick }) {
  const className =
    'block w-full px-4 py-3 text-left transition-colors hover:bg-ink focus-visible:bg-ink focus-visible:outline-none'
  const body = (
    <>
      <span className="block text-sm text-paper">{item.title}</span>
      {item.subtitle ? (
        <span className="mt-0.5 block line-clamp-1 text-xs text-quiet">{item.subtitle}</span>
      ) : null}
    </>
  )
  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel={item.rel || 'noopener noreferrer'}
        className={className}
        onClick={onPick}
      >
        {body}
      </a>
    )
  }
  return (
    <Link href={item.href} className={className} onClick={onPick}>
      {body}
    </Link>
  )
}

export default function SiteSearch({ onOpen } = {}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [tip, setTip] = useState(false)
  const [tipOut, setTipOut] = useState(false)
  const [modKey, setModKey] = useState('Ctrl')
  const [shortcutHint, setShortcutHint] = useState(true)
  const [q, setQ] = useState('')
  const [groups, setGroups] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const tipLiveRef = useRef(false)
  const router = useRouter()
  const path = usePathname()
  const titleId = useId()
  const { ready: traditionReady, promptOpen: traditionPrompt } = useTradition()
  const close = useCallback(() => setOpen(false), [])

  tipLiveRef.current = tip && !tipOut

  const dismissTip = useCallback(() => {
    if (tipLiveRef.current) setTipOut(true)
    else {
      setTip(false)
      setTipOut(false)
    }
  }, [])

  const openSearch = useCallback(() => {
    onOpen?.()
    dismissTip()
    setOpen(true)
  }, [onOpen, dismissTip])

  useEffect(() => {
    setMounted(true)
    const ua = navigator.userAgent || ''
    const mac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || ua) || ua.includes('Mac')
    setModKey(mac ? '⌘' : 'Ctrl')
    setShortcutHint(window.matchMedia('(hover: hover) and (pointer: fine)').matches)
  }, [])

  // Homepage + fine pointer only (skip phones / touch UIs).
  useEffect(() => {
    const onHome = path === '/'
    if (!onHome) {
      setTip(false)
      setTipOut(false)
      return
    }
    if (!mounted || !traditionReady || traditionPrompt || !shortcutHint) return
    const show = setTimeout(() => {
      setTipOut(false)
      setTip(true)
    }, TIP_SHOW_MS)
    return () => clearTimeout(show)
  }, [mounted, traditionReady, traditionPrompt, path, shortcutHint])

  useEffect(() => {
    if (!tip || tipOut) return
    const hide = setTimeout(dismissTip, TIP_HOLD_MS)
    return () => clearTimeout(hide)
  }, [tip, tipOut, dismissTip])

  useEffect(() => {
    if (!tipOut) return
    const done = setTimeout(() => {
      setTip(false)
      setTipOut(false)
    }, TIP_OUT_MS)
    return () => clearTimeout(done)
  }, [tipOut])

  useEffect(() => {
    close()
  }, [path, close])

  useEffect(() => {
    const onKey = (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'k') return
      const tag = e.target?.tagName
      // Don't steal ⌘K from other fields; allow it inside our own dialog input.
      if (
        !open &&
        (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable)
      ) {
        return
      }
      e.preventDefault()
      if (open) close()
      else openSearch()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close, openSearch])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const root = rootRef.current
    const undo = bindFocusTrap(root, { onEscape: close })
    const t = requestAnimationFrame(() => inputRef.current?.focus())
    return () => {
      document.body.style.overflow = ''
      undo()
      cancelAnimationFrame(t)
    }
  }, [open, close])

  useEffect(() => {
    if (!open) return
    const query = q.trim()
    if (query.length < SEARCH_MIN_LEN) {
      setGroups([])
      setTotal(0)
      setLoading(false)
      return
    }

    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: ctrl.signal,
        })
        if (!res.ok) throw new Error('search failed')
        const data = await res.json()
        setGroups(data.groups || [])
        setTotal(data.total || 0)
      } catch (err) {
        if (err?.name === 'AbortError') return
        setGroups([])
        setTotal(0)
      } finally {
        if (!ctrl.signal.aborted) setLoading(false)
      }
    }, 180)

    return () => {
      ctrl.abort()
      clearTimeout(timer)
    }
  }, [q, open])

  function onSubmit(e) {
    e.preventDefault()
    const query = q.trim()
    if (!query) return
    close()
    router.push(searchHref({ q: query }))
  }

  const trimmed = q.trim()
  const previewCount = groups.reduce((n, g) => n + g.items.length, 0)
  let previewHint = null
  if (trimmed.length > 0 && trimmed.length < SEARCH_MIN_LEN) {
    previewHint = `Type at least ${SEARCH_MIN_LEN} characters`
  } else if (loading) {
    previewHint = 'Searching…'
  } else if (trimmed.length >= SEARCH_MIN_LEN && !total) {
    previewHint = 'No matches'
  } else if (total > previewCount) {
    previewHint = 'Showing top matches'
  }

  const dialog =
    open && mounted
      ? createPortal(
          <div
            ref={rootRef}
            id="site-search-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="tradition-modal z-[70]"
          >
            <button type="button" className="tradition-modal-backdrop" aria-label="Close" onClick={close} />
            <div className="tradition-modal-panel relative z-10 flex max-h-[min(85dvh,36rem)] w-full max-w-lg flex-col overflow-hidden p-0 md:p-0">
              <div className="shrink-0 border-b border-line px-4 pb-3 pt-4 md:px-5 md:pt-5">
                <div className="flex items-start justify-between gap-3">
                  <p id={titleId} className="font-display text-lg text-paper">
                    Search
                  </p>
                  <button
                    type="button"
                    className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center text-quiet transition-colors hover:text-paper"
                    aria-label="Close"
                    onClick={close}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M6 6l12 12M18 6L6 18"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
                <form role="search" onSubmit={onSubmit} className="mt-3">
                  <label className="sr-only" htmlFor="site-search-input">
                    Search quotes, notes, and books
                  </label>
                  <input
                    ref={inputRef}
                    id="site-search-input"
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Quotes, notes, books…"
                    autoComplete="off"
                    enterKeyHint="search"
                    className="w-full border border-line bg-ink px-3 py-2.5 text-paper outline-none placeholder:text-quiet focus:border-paper/40"
                  />
                  <p className="mt-2 hidden text-[11px] text-quiet sm:block">
                    <kbd className="rounded-sm border border-line px-1 py-0.5 font-sans text-[10px]">⌘</kbd>
                    <span className="mx-0.5">/</span>
                    <kbd className="rounded-sm border border-line px-1 py-0.5 font-sans text-[10px]">Ctrl</kbd>
                    <span className="ml-1">K to toggle · Enter for all results</span>
                  </p>
                </form>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {previewHint ? (
                  <p className="px-4 py-3 text-xs text-quiet md:px-5">{previewHint}</p>
                ) : null}
                {groups.length ? (
                  <div className="pb-2">
                    {groups.map((group) => (
                      <section key={group.type} className="border-t border-line first:border-t-0">
                        <h3 className="px-4 pb-1 pt-3 text-[10px] uppercase tracking-[0.28em] text-quiet md:px-5">
                          {group.label}
                        </h3>
                        <ul>
                          {group.items.map((item) => (
                            <li key={`${item.type}-${item.href}`}>
                              <ResultRow item={item} onPick={close} />
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                ) : !q.trim() ? (
                  <p className="px-4 py-6 text-sm text-body/70 md:px-5">
                    Search across quotes, notes, and books.
                  </p>
                ) : null}
              </div>

              {trimmed.length >= SEARCH_MIN_LEN ? (
                <div className="shrink-0 border-t border-line px-4 py-3 md:px-5">
                  <button
                    type="button"
                    className="nav-link text-sm"
                    onClick={() => {
                      close()
                      router.push(searchHref({ q: trimmed }))
                    }}
                  >
                    {total > previewCount ? `View all ${total} results` : 'View all results'}
                  </button>
                </div>
              ) : null}
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <>
      <div className="relative flex h-14 items-center self-stretch md:h-16">
        <button
          type="button"
          className={`relative inline-flex min-h-10 min-w-10 items-center justify-center transition-colors hover:text-paper ${
            tip && !tipOut ? 'search-tip-target text-paper' : 'text-quiet'
          }`}
          aria-label="Search"
          aria-expanded={open}
          aria-haspopup="dialog"
          {...(open ? { 'aria-controls': 'site-search-dialog' } : {})}
          onClick={openSearch}
        >
          {tip && !tipOut ? <span className="search-tip-ring" aria-hidden /> : null}
          <SearchIcon />
        </button>

        {tip ? (
          <p
            className={`search-tip-copy pointer-events-none absolute right-0 top-full z-[80] mt-1.5 w-max max-w-[9rem] text-right${
              tipOut ? ' search-tip-out' : ''
            }`}
            role="status"
          >
            Press{' '}
            <kbd className="rounded-sm border border-line px-1 font-sans text-[10px] text-accent">
              {modKey}
            </kbd>{' '}
            <kbd className="rounded-sm border border-line px-1 font-sans text-[10px] text-accent">K</kbd>
            <span className="mt-0.5 block text-quiet">to search</span>
          </p>
        ) : null}
      </div>
      {dialog}
    </>
  )
}
