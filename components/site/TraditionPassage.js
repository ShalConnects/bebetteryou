'use client'

import { quoteShowsScripture } from '@/libs/scripture-core'
import { traditions } from '@/config/traditions'
import { useScriptureQuote, useTradition } from './TraditionProvider'

const passageNote = 'Interpretations vary — one perspective for reflection.'

function PassageNote() {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        className="inline-flex size-[1em] items-center justify-center text-quiet/70 transition-colors hover:text-paper"
        aria-describedby="passage-note-tooltip"
      >
        <svg viewBox="0 0 16 16" width="1em" height="1em" fill="currentColor" aria-hidden>
          <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm.75 11.25h-1.5V7h1.5v4.25ZM8 5.75a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75Z" />
        </svg>
      </button>
      <span
        id="passage-note-tooltip"
        role="tooltip"
        className="pointer-events-none invisible absolute left-1/2 top-full z-10 mt-2 w-56 -translate-x-1/2 rounded-sm border border-line bg-ink-soft p-2.5 text-xs leading-snug text-quiet/80 opacity-0 shadow-sm transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        {passageNote}
      </span>
    </span>
  )
}

export default function TraditionPassage({ tags, slug, n, theme, className = '' }) {
  const { tradition, showPassages, ready, openPicker, tagThemesMap } = useTradition()
  const entry = useScriptureQuote({ tags, slug, n, theme })

  if (!ready || !quoteShowsScripture(tags, theme, tagThemesMap)) return null

  if (!tradition) {
    return (
      <div className={`border-t border-line pt-5 ${className}`}>
        <p className="text-sm text-body/80">Add your tradition to see a related passage.</p>
        <button type="button" className="tag mt-3" onClick={openPicker}>Set tradition</button>
      </div>
    )
  }

  if (tradition === 'none' || !showPassages) return null

  if (!entry) {
    return (
      <div className={`border-t border-line pt-5 ${className}`}>
        <p className="text-sm text-quiet">No passage for this theme yet.</p>
      </div>
    )
  }

  const label = traditions.find((t) => t.id === tradition)?.label

  return (
    <div className={`border-t border-line pt-5 ${className}`} aria-label="From your tradition">
      <p className="text-[11px] uppercase tracking-[0.2em] text-quiet">
        From your tradition{label ? ` (${label})` : ''}
      </p>
      <blockquote className="mt-4 text-base leading-snug text-paper md:text-lg">{entry.text}</blockquote>
      <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-quiet">
        {entry.url ? (
          <a href={entry.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-paper">
            {entry.ref}
          </a>
        ) : (
          entry.ref
        )}
        <PassageNote />
      </p>
    </div>
  )
}
