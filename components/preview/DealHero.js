'use client'

import Link from 'next/link'
import { useState } from 'react'
import QuoteImage from '@/components/site/QuoteImage'
import { previewCopy as c } from '@/config/preview'
import { quoteAlt, quoteLabel } from '@/libs/quote-text'
import { sample } from '@/libs/sample'
import { saveImage, shareOrCopy } from '@/libs/share'
import { useDeck } from './DeckProvider'

/**
 * The deal: today's card up front, moods deal a new one with a flip.
 * `today` / `yesterday` are the two newest cards by number.
 */
export default function DealHero({ quotes, moods, today, yesterday, showWear }) {
  const { card, deal, show } = useDeck()
  const [mood, setMood] = useState(null)
  const [status, setStatus] = useState('')

  const day = mood ? null : card?.slug === yesterday?.slug ? 'yesterday' : card?.slug === today?.slug ? 'today' : null

  function dealMood(tag) {
    const pool = quotes.filter((q) => q.tags?.includes(tag) && q.slug !== card?.slug)
    const next = sample(pool.length ? pool : quotes, 1)[0]
    setMood(tag)
    setStatus('')
    if (next) show(next)
  }

  function pickDay(which) {
    setMood(null)
    setStatus('')
    show(which === 'yesterday' ? yesterday : today)
  }

  async function onShare() {
    try {
      const msg = await shareOrCopy({
        title: `Quote #${card.n}`,
        text: quoteLabel(card),
        url: new URL(`/quotes/${card.slug}`, window.location.origin).href,
      })
      if (msg) setStatus(msg)
    } catch (err) {
      if (err?.name !== 'AbortError') setStatus('Could not share')
    }
  }

  async function onSave() {
    try {
      await saveImage(card.src, `bby${card.n}.jpg`)
      setStatus('Saved')
    } catch {
      setStatus('Could not download')
    }
  }

  return (
    <section className="hero inset-x-page relative overflow-x-clip py-14 md:py-20">
      <div className="shell-inner grid items-center gap-12 lg:grid-cols-[1fr_auto] lg:gap-16">
        <div className="hero-rise text-center lg:text-left">
          <p className="pv-kicker">{c.kicker}</p>
          <h1 className="mt-4 font-display text-4xl tracking-wide text-paper md:text-6xl">{c.title}</h1>
          <p className="lede mx-auto text-base md:text-lg lg:mx-0">{c.sub}</p>

          <div className="mt-8 flex flex-wrap justify-center gap-2.5 lg:justify-start" role="group" aria-label="Moods">
            {moods.map(({ tag, label }) => (
              <button
                key={tag}
                type="button"
                onClick={() => dealMood(tag)}
                className={`pv-chip ${mood === tag ? 'pv-chip-on' : ''}`}
                aria-pressed={mood === tag}
              >
                {label}
              </button>
            ))}
          </div>

          {mood ? (
            <p className="mt-6">
              <button type="button" className="nav-link text-accent" onClick={() => dealMood(mood)}>
                ↻ {c.another}
              </button>
            </p>
          ) : null}
        </div>

        <div className="hero-rise-delay mx-auto w-full max-w-[19rem] sm:max-w-[22rem] lg:w-[24rem] lg:max-w-none">
          {yesterday ? (
            <div className="pv-seg mx-auto mb-5" role="group" aria-label="Day">
              {['yesterday', 'today'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => pickDay(d)}
                  className={day === d ? 'pv-seg-on' : undefined}
                  aria-pressed={day === d}
                >
                  {c[d]}
                </button>
              ))}
            </div>
          ) : null}

          <div className="pv-table">
            {card ? (
              <Link
                key={`${card.slug}-${deal}`}
                href={`/quotes/${card.slug}`}
                className="pv-card pv-card-deal block"
                aria-label={`Open quote #${card.n}`}
              >
                <QuoteImage src={card.src} alt={quoteAlt(card)} priority variant="detail" className="h-auto w-full" />
              </Link>
            ) : null}
          </div>

          {card ? (
            <div className="mt-6 flex items-center justify-center gap-5">
              <span className="font-display text-lg text-paper">#{card.n}</span>
              <button type="button" className="nav-link" onClick={onShare}>
                Share
              </button>
              <button type="button" className="nav-link" onClick={onSave}>
                Save
              </button>
              {showWear ? (
                <a href="#wear" className="nav-link">
                  Wear it
                </a>
              ) : null}
            </div>
          ) : null}
          <p className="mt-1 h-5 text-center text-xs text-quiet" aria-live="polite">
            {status}
          </p>
        </div>
      </div>
    </section>
  )
}
