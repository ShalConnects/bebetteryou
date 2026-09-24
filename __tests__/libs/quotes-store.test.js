import { cardRevision } from '@/config/quote-card'
import { overlayQuote } from '@/libs/quotes-store'

describe('overlayQuote', () => {
  it('lets Mongo win fields but keeps a local rev when Atlas omitted it', () => {
    const merged = overlayQuote(
      { slug: 'bby-1', n: 1, text: 'Local', rev: 2 },
      { slug: 'bby-1', n: 1, text: 'Remote' }
    )
    expect(merged.text).toBe('Remote')
    expect(merged.rev).toBe(2)
  })

  it('stamps the current revision on Mongo-only cards so they appear on the public site', () => {
    const merged = overlayQuote(undefined, { slug: 'bby-221', n: 221, text: 'New' })
    expect(merged.rev).toBe(cardRevision)
  })

  it('does not invent a rev for a local card that never had one', () => {
    const merged = overlayQuote({ slug: 'bby-9', n: 9, text: 'Old' }, { slug: 'bby-9', n: 9, text: 'Old' })
    expect(merged.rev).toBeUndefined()
  })

  it('drops Mongo document fields but keeps createdAt as ISO for week review', () => {
    const when = new Date('2026-09-20T12:00:00.000Z')
    const merged = overlayQuote(undefined, {
      _id: { buffer: Buffer.from('1') },
      slug: 'bby-221',
      n: 221,
      text: 'New',
      createdAt: when,
    })
    expect(merged._id).toBeUndefined()
    expect(merged.createdAt).toBe(when.toISOString())
    expect(merged.slug).toBe('bby-221')
  })
})
