'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { previewCopy as c, pv } from '@/config/preview'
import { quoteLabel } from '@/libs/quote-text'
import { sample } from '@/libs/sample'
import { saveImage, shareOrCopy } from '@/libs/share'

/**
 * Labelled actions under a card: Share · Save · (Wear it) · (Another like this).
 * `wearHref` shows Wear it; `pool` (sibling slugs) shows Another like this.
 */
export default function CardActions({ card, wearHref, pool, className = '' }) {
  const router = useRouter()
  const [status, setStatus] = useState('')

  async function run(fn, done) {
    try {
      setStatus((await fn()) || done || '')
    } catch (err) {
      if (err?.name !== 'AbortError') setStatus('Something went wrong')
    }
  }

  const share = () =>
    run(() =>
      shareOrCopy({
        title: `Quote #${card.n}`,
        text: quoteLabel(card),
        url: new URL(`/quotes/${card.slug}`, window.location.origin).href,
      })
    )
  const save = () => run(() => saveImage(card.src, `bby${card.n}.jpg`), 'Saved')
  const another = () => router.push(pv(`/quotes/${sample(pool, 1)[0]}`))

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
        <span className="font-display text-lg text-paper">#{card.n}</span>
        <button type="button" className="nav-link" onClick={share}>
          Share
        </button>
        <button type="button" className="nav-link" onClick={save}>
          Save
        </button>
        {wearHref ? (
          <a href={wearHref} className="nav-link">
            Wear it
          </a>
        ) : null}
        {pool?.length ? (
          <button type="button" className="nav-link text-accent" onClick={another}>
            ↻ {c.likeThis}
          </button>
        ) : null}
      </div>
      <p className="mt-1 h-5 text-center text-xs text-quiet" aria-live="polite">
        {status}
      </p>
    </div>
  )
}
