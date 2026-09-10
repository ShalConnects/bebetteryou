'use client'

import { useEffect, useRef, useState } from 'react'
import ScrollLink from '@/components/site/ScrollLink'

/**
 * Dropdown of `{ id, label, href }` options. They stay anchors so tag/topic
 * URLs remain crawlable; callers build the hrefs so this stays route-agnostic.
 */
export default function FilterMenu({ label, options, active }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Picking an option navigates, which re-renders with a new `active`.
  useEffect(() => setOpen(false), [active])

  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (e.key === 'Escape' || !ref.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  // A menu offering only "All" has nothing to filter by.
  if (options.length < 2) return null
  const current = options.find((o) => o.id === active) ?? options[0]

  return (
    <div ref={ref} className="filter-menu">
      <button
        type="button"
        className={open || current !== options[0] ? 'tag-active' : 'tag'}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {label}: {current.label}
      </button>
      {open ? (
        <div className="filter-menu-panel" role="group" aria-label={label}>
          {options.map((o) => (
            <ScrollLink
              key={o.id ?? 'all'}
              href={o.href}
              className={`filter-menu-item ${o.id === active ? 'tag-active' : 'tag'}`}
              aria-current={o.id === active ? 'true' : undefined}
            >
              {o.label}
            </ScrollLink>
          ))}
        </div>
      ) : null}
    </div>
  )
}
