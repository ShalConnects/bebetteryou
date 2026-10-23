import quotes from '@/data/quotes.json'
import tags from '@/data/tags.json'
import { AUTO_TAG_CONFIDENCE, assignScriptureTheme, suggestQuoteLane, themeForTag } from '@/libs/quote-suggest'

const examples = quotes.map((quote) => ({ text: quote.text, tags: quote.tags }))

describe('suggestQuoteLane', () => {
  it('returns nothing for an empty quote', () => {
    expect(suggestQuoteLane('   ', tags, examples)).toEqual({
      tags: [],
      theme: '',
      scores: [],
      review: [],
      needsReview: false,
    })
  })

  it('auto-tags a library quote above the confidence threshold and sets that tag’s theme', () => {
    const quote = quotes.find((row) => row.n === 17)
    const result = suggestQuoteLane(quote.text, tags, examples)
    expect(result.needsReview).toBe(false)
    expect(result.tags).toEqual(['Love', 'Yourself'])
    expect(result.scores.find((row) => row.tag === 'Love').confidence).toBeGreaterThanOrEqual(AUTO_TAG_CONFIDENCE)
    expect(result.theme).toBe(assignScriptureTheme(result.tags, tags))
    expect(result.theme).toBe('love')
  })

  it('sends a weak match to review with a score and the catalog theme', () => {
    const result = suggestQuoteLane('Keep going. You will overcome this.', tags, examples)
    expect(result.tags).toEqual([])
    expect(result.theme).toBe('')
    expect(result.needsReview).toBe(true)
    expect(result.review.length).toBeGreaterThan(0)
    expect(result.review[0].confidence).toBeLessThan(AUTO_TAG_CONFIDENCE)
    expect(result.review[0].theme).toBe(themeForTag(result.review[0].tag, tags))
  })

  it('sends an unrelated line to review without auto-tagging', () => {
    const result = suggestQuoteLane('The telescope found a comet near Jupiter last night.', tags, examples)
    expect(result.tags).toEqual([])
    expect(result.needsReview).toBe(true)
    expect(result.scores.every((row) => row.confidence === 0)).toBe(true)
    expect(result.review).toEqual([])
  })

  it('takes the scripture theme from the catalog pairing of the selected tag', () => {
    const catalog = tags.map((tag) => (tag.name === 'Love' ? { ...tag, theme: 'custom-love' } : tag))
    const quote = quotes.find((row) => row.n === 17)
    expect(suggestQuoteLane(quote.text, catalog, examples).theme).toBe('custom-love')
    expect(themeForTag('Mindset', tags)).toBe('clarity')
    expect(assignScriptureTheme(['Growth'], tags)).toBe('growth')
  })
})
