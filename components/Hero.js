'use client'

import Link from 'next/link'
import { useState } from 'react'
import HeroVideo from '@/components/site/HeroVideo'
import QuoteImage from '@/components/site/QuoteImage'
import { heroQuoteCount } from '@/config/quotes'
import { copy } from '@/config/site'
import { sample } from '@/libs/sample'

/** `moods` adds mood chips that re-deal the stack; `video` ({ src, poster }) adds a background loop. */
export default function Hero({ quotes = [], moods, video }) {
  const [picked, setPicked] = useState(() => quotes.slice(0, heroQuoteCount))
  const [mood, setMood] = useState(null)
  const [deal, setDeal] = useState(0)

  function reshuffle(tag) {
    const pool = tag ? quotes.filter((q) => q.tags?.includes(tag)) : quotes
    setMood(tag)
    setDeal((d) => d + 1)
    setPicked(sample(pool.length ? pool : quotes, heroQuoteCount))
  }

  return (
    <section className="hero inset-x-page relative overflow-x-clip py-16 md:py-24">
      {video ? <HeroVideo {...video} /> : null}
      <div className="shell-inner relative flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
        <div className="hero-rise relative z-10 max-w-sm text-center lg:shrink-0 lg:text-left">
          <h1 className="font-display text-3xl tracking-wide text-paper md:text-5xl">{copy.heroLine}</h1>
          <p className="lede mx-auto lg:mx-0">{copy.heroSub}</p>
          {moods ? (
            <div
              className="mt-8 flex flex-wrap justify-center gap-2 lg:justify-start"
              role="group"
              aria-label={copy.surpriseTitle}
            >
              {moods.map(({ tag, label }) => (
                <button
                  key={tag}
                  type="button"
                  className={`chip ${mood === tag ? 'chip-on' : ''}`}
                  aria-pressed={mood === tag}
                  onClick={() => reshuffle(tag)}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {picked.length ? (
          <div className={`hero-scatter hero-rise-delay ${moods ? 'hero-deal' : ''}`}>
            {picked.map((q, i) => (
              <Link
                key={`${q.slug}-${i}-${deal}`}
                href={`/quotes/${q.slug}`}
                className="hero-scatter-card"
                aria-label={`Quote #${q.n}`}
              >
                <QuoteImage src={q.src} alt={`#${q.n}`} priority={i < 2} variant="hero" className="h-auto w-full" />
              </Link>
            ))}
            <button
              type="button"
              className="hero-scatter-refresh"
              aria-label="Show random quotes"
              onClick={() => reshuffle(mood)}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>
    </section>
  )
}
