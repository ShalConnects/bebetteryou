'use client'

import { quoteShowsScripture } from '@/libs/scripture-core'
import { traditions } from '@/config/traditions'
import { useScriptureQuote, useTradition } from './TraditionProvider'

export default function TraditionPassage({ tags, slug, n, className = '' }) {
  const { tradition, showPassages, ready, openPicker } = useTradition()
  const entry = useScriptureQuote({ tags, slug, n })

  if (!ready || !quoteShowsScripture(tags)) return null

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
      <p className="text-[11px] uppercase tracking-[0.2em] text-quiet">From your tradition</p>
      {label ? <p className="mt-2 text-xs text-quiet/80">{label}</p> : null}
      <blockquote className="mt-4 text-base leading-snug text-paper md:text-lg">{entry.text}</blockquote>
      <p className="mt-3 text-sm text-quiet">
        {entry.url ? (
          <a href={entry.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-paper">
            {entry.ref}
          </a>
        ) : (
          entry.ref
        )}
      </p>
      <p className="mt-2 text-xs text-quiet/70">Interpretations vary — one perspective for reflection.</p>
    </div>
  )
}
