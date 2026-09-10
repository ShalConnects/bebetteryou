'use client'

import { useState } from 'react'
import QuoteCard from '@/components/site/QuoteCard'
import TraditionPassage from '@/components/site/TraditionPassage'
import { copy } from '@/config/site'
import { sample } from '@/libs/sample'

export default function SurpriseMood({ quotes = [], moods = [] }) {
  const [mood, setMood] = useState(null)
  const [picked, setPicked] = useState(null)

  function draw(tag) {
    const pool = quotes.filter((q) => q.tags?.includes(tag))
    setMood(tag)
    setPicked(sample(pool.length ? pool : quotes, 1)[0] ?? null)
  }

  return (
    <div
      className={`mx-auto max-w-lg text-center ${
        picked ? 'md:grid md:max-w-5xl md:grid-cols-2 md:items-center md:gap-12' : ''
      }`}
    >
      <div>
        <h2 className="heading-sm">{copy.surpriseTitle}</h2>
        <p className="lede mx-auto">{copy.surpriseSub}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-3">
          {moods.map(({ tag, label }) => (
            <button
              key={tag}
              type="button"
              onClick={() => draw(tag)}
              className={mood === tag ? 'tag-active' : 'tag'}
              aria-pressed={mood === tag}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {picked ? (
        <div className="mx-auto mt-10 w-full max-w-[18rem] sm:max-w-[22rem] md:mt-0 md:max-w-[26rem]">
          <QuoteCard quote={picked} priority className="w-full" />
          <TraditionPassage tags={picked.tags} slug={picked.slug} n={picked.n} className="text-left" />
          <p className="mt-6 text-center">
            <button type="button" className="btn" onClick={() => draw(mood)}>
              Another
            </button>
          </p>
        </div>
      ) : null}
    </div>
  )
}
