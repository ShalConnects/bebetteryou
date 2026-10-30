/**
 * @jest-environment node
 */
jest.mock('@/libs/social', () => ({}))
jest.mock('@/libs/social/providers/youtube', () => ({}))
jest.mock('@/libs/social/quote-short', () => ({}))

import { pickVerseShort, verseKey } from '@/libs/social/verse-short'

const book = {
  christianity: { hope: [{ ref: 'Rom 15:13', text: 'May the God of hope fill you' }] },
  islam: { hope: [{ ref: 'Quran 94:5', text: 'With hardship comes ease' }] },
}
const quotes = [
  { slug: 'bby-1', n: 1, tags: [], theme: 'hope' },
  { slug: 'bby-2', n: 2, tags: [], theme: 'hope' },
]
const day0 = 0 // day index 0 → christianity first

describe('pickVerseShort', () => {
  it("starts with today's tradition and the oldest quote", () => {
    const pick = pickVerseShort(quotes, {}, book, {}, day0)
    expect([pick.tradition, pick.quote.slug, pick.passage.ref]).toEqual(['christianity', 'bby-1', 'Rom 15:13'])
  })

  it('skips pairs already on YouTube, then moves to the next tradition', () => {
    const posted = Object.fromEntries(quotes.map((q) => [verseKey(q.slug, 'christianity'), { youtube: { ok: true } }]))
    const pick = pickVerseShort(quotes, posted, book, {}, day0)
    expect([pick.tradition, pick.quote.slug]).toEqual(['islam', 'bby-1'])
  })

  it('returns null when every pair is used', () => {
    const posted = Object.fromEntries(
      quotes.flatMap((q) => ['christianity', 'islam'].map((t) => [verseKey(q.slug, t), { youtube: { ok: true } }]))
    )
    expect(pickVerseShort(quotes, posted, book, {}, day0)).toBeNull()
  })
})
