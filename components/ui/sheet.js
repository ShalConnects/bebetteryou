'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Button } from './button'

/** Right-hand panel over the page (full screen on phones). Esc or the backdrop closes it. */
export function Sheet({ title, onClose, children }) {
  const panel = useRef(null)
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    panel.current?.focus()
    const onKey = (e) => e.key === 'Escape' && close.current()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50" onClick={onClose}>
      <aside
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-xl flex-col border-l border-border bg-background outline-none"
      >
        <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X aria-hidden />
          </Button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">{children}</div>
      </aside>
    </div>
  )
}
