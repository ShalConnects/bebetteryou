'use client'

import { useRef, useState } from 'react'

/** Collapsible section block for multi-tool admin pages. Scrolls into view when opened. */
export default function DashSection({ title, description, children, className = '', defaultOpen = true }) {
  const ref = useRef(null)
  const [open, setOpen] = useState(defaultOpen)

  function handleToggle(e) {
    const next = e.currentTarget.open
    if (next === open) return
    setOpen(next)
    if (!next) return
    requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <details
      ref={ref}
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
