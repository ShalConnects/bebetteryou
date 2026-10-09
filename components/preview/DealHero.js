'use client'

import { useState } from 'react'
import { previewCopy as c, pv } from '@/config/preview'
import { sample } from '@/libs/sample'
import CardActions from './CardActions'
import Chips from './Chips'
import { useDeck } from './DeckProvider'
import TableCard from './TableCard'

/**
 * The deal: today's card up front, moods deal a new one with a flip.
 * `today` / `yesterday` are the two newest cards by number.
 */
export default function DealHero({ quotes, moods, today, yesterday, showWear }) {
  const { card, deal, show } = useDeck()
  const [mood, setMood] = useState(null)

  function dealMood(tag) {
    const pool = quotes.filter((q) => q.tags?.includes(tag) && q.slug !== card?.slug)
    setMood(tag)
    show(sample(pool.length ? pool : quotes, 1)[0])
  }

  const days = { yesterday, today }
  const pickDay = (d) => () => {
    setMood(null)
    show(days[d])
  }

  return (
    <section className="hero inset-x-page relative overflow-x-clip py-14 md:py-20">
      <div className="shell-inner grid items-center gap-12 lg:grid-cols-[1fr_auto] lg:gap-16">
        <div className="hero-rise text-center lg:text-left">
          <p className="pv-kicker">{c.kicker}</p>
          <h1 className="mt-4 font-display text-4xl tracking-wide text-paper md:text-6xl">{c.title}</h1>
          <p className="lede mx-auto text-base md:text-lg lg:mx-0">{c.sub}</p>
          <Chips
            label="Moods"
            className="mt-8 justify-center lg:justify-start"
            items={moods.map(({ tag, label }) => ({
              key: tag,
              label,
              active: mood === tag,
              onClick: () => dealMood(tag),
            }))}
          />
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
              {Object.keys(days).map((d) => {
                const on = !mood && card?.slug === days[d].slug
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={pickDay(d)}
                    className={on ? 'pv-seg-on' : undefined}
                    aria-pressed={on}
                  >
                    {c[d]}
                  </button>
                )
              })}
            </div>
          ) : null}
          <div className="pv-table">
            <TableCard
              key={`${card.slug}-${deal}`}
              quote={card}
              href={pv(`/quotes/${card.slug}`)}
              variant="detail"
              priority
              className="pv-card-deal"
            />
          </div>
          <CardActions card={card} wearHref={showWear ? '#wear' : undefined} className="mt-6" />
        </div>
      </div>
    </section>
  )
}
