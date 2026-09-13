import { findDuplicateQuote, quoteFingerprint } from '@/libs/quote-text'

describe('quoteFingerprint', () => {
  it('collapses space and case so paste dupes match', () => {
    expect(quoteFingerprint('  Hello\nWorld  ')).toBe('hello world')
    expect(quoteFingerprint('Hello World')).toBe('hello world')
  })

  it('treats curly quotes like straight ones', () => {
    expect(quoteFingerprint('\u201Cwin\u201D')).toBe('"win"')
  })
})

describe('findDuplicateQuote', () => {
  const catalog = [
    { n: 1, slug: 'bby-1', text: 'Be yourself.' },
    { n: 2, slug: 'bby-2', text: 'Keep going' },
  ]

  it('returns the first fingerprint match', () => {
    expect(findDuplicateQuote(catalog, 'be  yourself.')).toEqual(catalog[0])
  })

  it('returns null when nothing matches', () => {
    expect(findDuplicateQuote(catalog, 'Something new')).toBeNull()
  })
})
