/**
 * @jest-environment node
 */
import { hit } from '@/libs/rate-limit'
import { safeEqual } from '@/libs/secret'
import { quoteTitle } from '@/libs/quote-text'
import { canTransition } from '@/libs/print-status'

describe('safeEqual', () => {
  it('matches equal strings only, and never empty ones', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
    expect(safeEqual('', '')).toBe(false)
    expect(safeEqual('x', undefined)).toBe(false)
  })
})

describe('rate limit hit', () => {
  it('counts per key and reports a retry time once over', async () => {
    for (let i = 0; i < 3; i++) expect(await hit('t:a', 3, 60_000)).toBe(0)
    expect(await hit('t:a', 3, 60_000)).toBeGreaterThan(0)
    expect(await hit('t:b', 3, 60_000)).toBe(0)
  })
})

describe('quoteTitle', () => {
  it('shortens at a word and adds the credit', () => {
    const text = 'Fall seven times and stand up eight, then keep going until the road ends somewhere'
    expect(quoteTitle({ n: 1, text, author: 'Proverb' })).toBe(
      'Fall seven times and stand up eight, then keep going until… — Proverb'
    )
    expect(quoteTitle({ n: 4 })).toBe('Motivational quote card #4')
  })
})

describe('print order flow', () => {
  it('claims before submitting and accepts late cancellations', () => {
    expect(canTransition('paid', 'submitting')).toBe(true)
    expect(canTransition('submitting', 'submitting')).toBe(false)
    expect(canTransition('submitted', 'cancelled')).toBe(true)
  })
})
