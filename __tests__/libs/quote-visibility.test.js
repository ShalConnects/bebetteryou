import { isQuotePublic, withVisibility } from '@/libs/quote-visibility'

describe('quote visibility', () => {
  it('treats missing status as public (legacy catalog)', () => {
    expect(isQuotePublic({ slug: 'bby-1' })).toBe(true)
    expect(isQuotePublic({ slug: 'bby-1', status: 'published' })).toBe(true)
  })

  it('hides draft and scheduled quotes', () => {
    expect(isQuotePublic({ slug: 'bby-1', status: 'draft' })).toBe(false)
    expect(isQuotePublic({ slug: 'bby-1', status: 'scheduled' })).toBe(false)
  })

  it('sets scheduled publishAt and clears it when returning to draft', () => {
    const when = '2026-10-20T14:00:00.000Z'
    const scheduled = withVisibility({ slug: 'bby-1', status: 'draft' }, { status: 'scheduled', publishAt: when })
    expect(scheduled.status).toBe('scheduled')
    expect(scheduled.publishAt).toBe(when)

    const draft = withVisibility(scheduled, { status: 'draft' })
    expect(draft.status).toBe('draft')
    expect(draft.publishAt).toBeUndefined()
  })
})
