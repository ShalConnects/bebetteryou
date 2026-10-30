/**
 * @jest-environment node
 */

jest.mock('@/libs/social/post-store', () => ({
  listPostedQuoteSlugs: jest.fn(),
}))

import { listPostedQuoteSlugs } from '@/libs/social/post-store'
import { fridayWeekRange, pickWeekReviewQuotes, WEEK_REVIEW_MIN_NETWORKS } from '@/libs/week-review'

describe('pickWeekReviewQuotes', () => {
  const fri = new Date('2026-10-30T12:00:00.000Z')
  const catalog = [1, 2, 23, 24, 25, 26].map((n) => ({
    slug: `bby-${n}`,
    n,
    src: `/${n}.jpg`,
    text: `Q${n}`,
  }))

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('asks for multi-network posts so LinkedIn-only tests are excluded', async () => {
    listPostedQuoteSlugs.mockResolvedValueOnce([
      { slug: 'bby-26', at: '2026-10-29T14:30:00.000Z', networks: 7 },
      { slug: 'bby-25', at: '2026-10-29T05:40:00.000Z', networks: 7 },
      { slug: 'bby-23', at: '2026-10-24T14:30:00.000Z', networks: 7 },
    ])
    const range = fridayWeekRange(fri)
    const { quotes, mode } = await pickWeekReviewQuotes(catalog, range)
    expect(listPostedQuoteSlugs).toHaveBeenCalledWith({
      since: range.start,
      until: range.end,
      minNetworks: WEEK_REVIEW_MIN_NETWORKS,
    })
    expect(mode).toBe('posted')
    expect(quotes.map((q) => q.n).sort((a, b) => a - b)).toEqual([23, 25, 26])
  })

  it('falls back to all multi-network posts when the window is empty', async () => {
    listPostedQuoteSlugs.mockResolvedValueOnce([]).mockResolvedValueOnce([
      { slug: 'bby-23', at: '2026-10-20T14:00:00.000Z', networks: 7 },
    ])
    const { quotes, mode } = await pickWeekReviewQuotes(catalog, fridayWeekRange(fri))
    expect(mode).toBe('posted-all')
    expect(quotes.map((q) => q.slug)).toEqual(['bby-23'])
    expect(listPostedQuoteSlugs).toHaveBeenNthCalledWith(2, { minNetworks: WEEK_REVIEW_MIN_NETWORKS })
  })
})
