/**
 * @jest-environment node
 */

jest.mock('@/libs/content', () => ({
  listQuotes: jest.fn(),
}))

jest.mock('@/libs/newsletter', () => ({
  notifyQuoteSubscribers: jest.fn(),
}))

jest.mock('@/libs/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
}))

import { listQuotes } from '@/libs/content'
import { notifyQuoteSubscribers } from '@/libs/newsletter'
import { pickLatestPublicQuote, runQuoteEmailCron } from '@/libs/newsletter-cron'

describe('newsletter cron', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('picks the highest card number with slug+src', async () => {
    listQuotes.mockResolvedValue([
      { n: 10, slug: 'bby-10', src: '/a.jpg' },
      { n: 22, slug: 'bby-22', src: '/b.jpg' },
      { n: 21, slug: 'bby-21' },
    ])
    const quote = await pickLatestPublicQuote()
    expect(quote.slug).toBe('bby-22')
  })

  it('skips when no public quote', async () => {
    listQuotes.mockResolvedValue([])
    await expect(runQuoteEmailCron()).resolves.toEqual({ skipped: true, reason: 'no_quote' })
    expect(notifyQuoteSubscribers).not.toHaveBeenCalled()
  })

  it('notifies subscribers for the latest quote', async () => {
    listQuotes.mockResolvedValue([{ n: 5, slug: 'bby-5', src: '/q.jpg', text: 'Hi' }])
    notifyQuoteSubscribers.mockResolvedValue({
      total: 2,
      sent: 2,
      failed: 0,
      eligible: 50,
      batchSize: 100,
    })
    const result = await runQuoteEmailCron()
    expect(notifyQuoteSubscribers).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'bby-5', n: 5 })
    )
    expect(result).toMatchObject({ skipped: false, slug: 'bby-5', sent: 2, total: 2 })
  })
})
