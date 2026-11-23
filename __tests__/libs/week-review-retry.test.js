/**
 * @jest-environment node
 */
const mockCalls = []
const mockPosted = {}
const mockOk = (id) => async () => (mockCalls.push(id), { url: `https://${id}` })
jest.mock('@/libs/quotes-store', () => ({ readQuotes: async () => [] }))
jest.mock('@/libs/week-review', () => ({
  ...jest.requireActual('@/libs/week-review'),
  pickWeekReviewQuotes: async () => ({ quotes: [{ slug: 'bby-1', n: 1, src: '/q/1.jpg' }], mode: 'mockPosted' }),
}))
jest.mock('@/libs/social', () => ({
  readyNetworks: async () =>
    ['instagram', 'facebook', 'bluesky', 'telegram', 'pinterest', 'youtube', 'threads'].map((id) => ({ id, label: id, ready: true })),
  quoteCaption: async () => 'c',
  resolveQuoteImageBuffer: async () => Buffer.from(''),
}))
jest.mock('@/libs/week-collage.mjs', () => ({ renderWeekCollage: async () => ({ buffer: Buffer.from(''), width: 1, height: 1 }) }))
jest.mock('@/libs/asset-store', () => ({ saveAsset: async () => '/c.jpg' }))
jest.mock('@/libs/newsletter', () => ({ notifyQuoteDigest: async () => (mockCalls.push('email'), { sent: 1 }) }))
jest.mock('@/libs/social/post-store', () => ({
  readPostsBySlugs: async ([slug]) => ({ [slug]: mockPosted }),
  recordPost: async () => {},
}))
jest.mock('@/libs/social/quote-short', () => ({ encodeWeekShort: async () => ({ video: Buffer.from(''), poster: null }) }))
jest.mock('@/libs/social/providers/instagram', () => ({ postInstagramCarousel: (...a) => mockOk('instagram')(...a) }))
jest.mock('@/libs/social/providers/facebook', () => ({ postFacebook: (...a) => mockOk('facebook')(...a) }))
jest.mock('@/libs/social/providers/bluesky', () => ({ postBluesky: (...a) => mockOk('bluesky')(...a), clipBlueskyText: (t) => t }))
jest.mock('@/libs/social/providers/telegram', () => ({ postTelegram: (...a) => mockOk('telegram')(...a) }))
jest.mock('@/libs/social/providers/pinterest', () => ({ postPinterest: (...a) => mockOk('pinterest')(...a) }))
jest.mock('@/libs/social/providers/youtube', () => ({ postYouTube: (...a) => mockOk('youtube')(...a) }))
jest.mock('@/libs/social/providers/threads', () => ({ postThreadsThread: (...a) => mockOk('threads')(...a) }))

import { publishWeekReview } from '@/libs/week-review-publish'

describe('publishWeekReview re-run', () => {
  it('posts everywhere and emails on the first run', async () => {
    await publishWeekReview(new Date('2026-11-27T14:00:00Z'))
    expect(mockCalls.sort()).toEqual(['bluesky', 'email', 'facebook', 'instagram', 'pinterest', 'telegram', 'threads', 'youtube'])
  })

  it('only retries the networks that failed, without a second email', async () => {
    mockCalls.length = 0
    for (const id of ['instagram', 'facebook', 'bluesky', 'pinterest', 'youtube']) mockPosted[id] = { ok: true }
    mockPosted.telegram = { ok: false }
    const result = await publishWeekReview(new Date('2026-11-27T14:00:00Z'))
    expect(mockCalls.sort()).toEqual(['telegram', 'threads'])
    expect(result.email.skipped).toBe(true)
  })
})
