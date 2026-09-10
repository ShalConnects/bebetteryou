import {
  resolveTranslation,
  scriptureFor,
  scriptureShareText,
  quoteShowsScripture,
  themesForTags,
  themeEntries,
  seedFromKey,
} from '@/libs/scripture-core'

const book = {
  christianity: {
    perseverance: [
      { ref: 'Philippians 4:13', text: 'I can do all things through him who strengthens me.' },
      { ref: 'Isaiah 40:31', text: 'They who wait for the Lord shall renew their strength.' },
    ],
    clarity: [{ ref: 'James 1:5', text: 'If any of you lacks wisdom, let him ask God.' }],
  },
  secular: {
    perseverance: [{ ref: 'Marcus Aurelius', text: 'You have power over your mind.' }],
  },
}

describe('scripture-core', () => {
  it('maps tags to themes', () => {
    expect(themesForTags(['Motivation', 'Unknown'])).toEqual(['perseverance'])
    expect(themesForTags(['Mindset'])).toEqual(['clarity'])
  })

  it('shows for all catalog tags', () => {
    expect(quoteShowsScripture(['Motivation'])).toBe(true)
    expect(quoteShowsScripture([])).toBe(false)
  })

  it('returns theme-matched entry', () => {
    expect(scriptureFor(book, 'christianity', ['Motivation'], 'bby-test')?.text).toBeTruthy()
    expect(scriptureFor(book, 'christianity', ['Mindset'], 'a')?.ref).toBe('James 1:5')
  })

  it('rotates passages by seed', () => {
    const a = scriptureFor(book, 'christianity', ['Motivation'], 'bby-88')
    const b = scriptureFor(book, 'christianity', ['Motivation'], 'bby-89')
    expect(a?.ref).not.toBe(b?.ref)
  })

  it('skips none and invalid traditions', () => {
    expect(scriptureFor(book, 'none', ['Motivation'], 'x')).toBeNull()
    expect(scriptureFor(book, 'invalid', ['Motivation'], 'x')).toBeNull()
  })

  it('enriches share text with passage', () => {
    const entry = scriptureFor(book, 'secular', ['Motivation'], 'x')
    expect(scriptureShareText('Quote #1', entry)).toMatch(/Marcus Aurelius/)
  })

  it('normalizes single object to array', () => {
    expect(themeEntries({ ref: 'R', text: 'T' })).toHaveLength(1)
    expect(themeEntries([{ ref: 'R', text: 'T' }])).toHaveLength(1)
  })

  it('seedFromKey is stable', () => {
    expect(seedFromKey('bby-88')).toBe(seedFromKey('bby-88'))
  })

  it('resolves translation alt', () => {
    const entry = {
      ref: 'Philippians 4:13',
      text: 'NIV text',
      alt: { kjv: { ref: 'Philippians 4:13', text: 'KJV text' } },
    }
    expect(resolveTranslation(entry, 'kjv')?.text).toBe('KJV text')
    expect(resolveTranslation(entry, 'niv')?.text).toBe('NIV text')
  })
})
