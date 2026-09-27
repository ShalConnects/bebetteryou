'use client'

import { useEffect, useRef, useState } from 'react'

function scrollToSection(el) {
  requestAnimationFrame(() => {
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

/** Collapsible section — optional `persistKey` remembers open/closed in localStorage. */
export default function DashSection({
  title,
  description,
  children,
  className = '',
  defaultOpen = true,
  persistKey = '',
  id,
  /** When true, force open and scroll into view (deep links / Analytics nav). */
  focus = false,
}) {
  const ref = useRef(null)
  const storageKey = persistKey ? `bby-dash-section:${persistKey}` : ''
  const [open, setOpen] = useState(defaultOpen || focus)

  useEffect(() => {
    if (focus) {
      setOpen(true)
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, '1')
        } catch {
          /* ignore */
        }
      }
      scrollToSection(ref.current)
      return
    }
    if (!storageKey || defaultOpen) return
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved === '1') setOpen(true)
      if (saved === '0') setOpen(false)
    } catch {
      /* ignore */
    }
  }, [storageKey, defaultOpen, focus])

  function persist(next) {
    if (!storageKey) return
    try {
      localStorage.setItem(storageKey, next ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  function handleToggle(e) {
    const next = e.currentTarget.open
    if (next === open) return
    setOpen(next)
    persist(next)
    if (!next) return
    scrollToSection(ref.current)
  }

  return (
    <details
      ref={ref}
      id={id}
      className={`group/section scroll-mt-6 border border-line open:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] ${className}`}
      open={open}
      onToggle={handleToggle}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-6 py-4 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block font-display text-lg text-paper">{title}</span>
          {description ? <span className="mt-1 block text-sm text-quiet">{description}</span> : null}
        </span>
        <span
          aria-hidden
          className="mt-1 shrink-0 text-quiet transition-transform duration-200 group-open/section:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className="space-y-4 border-t border-line p-6">{children}</div>
    </details>
  )
}
