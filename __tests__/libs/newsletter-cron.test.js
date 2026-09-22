/**
 * @jest-environment node
 */

jest.mock('@/libs/content', () => ({
  listQuotes: jest.fn(),
  getQuote: jest.fn(),
}))

jest.mock('@/libs/newsletter', () => ({
  notifyQuoteSubscribers: jest.fn(),
}))

jest.mock('@/libs/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
}))

jest.mock('@/libs/social/schedule-store', () => ({
  findEarliestDoneScheduleForUtcDay: jest.fn(),
}))

import { getQuote, listQuotes } from '@/libs/content'
import { notifyQuoteSubscribers } from '@/libs/newsletter'
import {
  pickLatestPublicQuote,
  pickQuoteForEmailCron,
  runQuoteEmailCron,
} from '@/libs/newsletter-cron'
import { findEarliestDoneScheduleForUtcDay } from '@/libs/social/schedule-store'

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

  it('prefers today social schedule slug over latest public', async () => {
    findEarliestDoneScheduleForUtcDay.mockResolvedValue({
      slug: 'bby-5',
      status: 'done',
      runAt: '2026-09-21T14:00:00.000Z',
    })
    getQuote.mockResolvedValue({ n: 5, slug: 'bby-5', src: '/5.jpg', text: 'Five' })
    listQuotes.mockResolvedValue([{ n: 20, slug: 'bby-20', src: '/20.jpg' }])

    const picked = await pickQuoteForEmailCron(new Date('2026-09-21T15:00:00.000Z'))
    expect(picked).toEqual({
      source: 'social_schedule',
      quote: expect.objectContaining({ slug: 'bby-5', n: 5 }),
    })
    expect(getQuote).toHaveBeenCalledWith('bby-5')
  })

  it('falls back to latest public when no social schedule today', async () => {
    findEarliestDoneScheduleForUtcDay.mockResolvedValue(null)
    listQuotes.mockResolvedValue([
      { n: 5, slug: 'bby-5', src: '/5.jpg' },
      { n: 20, slug: 'bby-20', src: '/20.jpg' },
    ])

    const picked = await pickQuoteForEmailCron(new Date('2026-09-21T15:00:00.000Z'))
    expect(picked.source).toBe('latest_public')
    expect(picked.quote.slug).toBe('bby-20')
  })

  it('falls back when social slug is not a usable public quote', async () => {
    findEarliestDoneScheduleForUtcDay.mockResolvedValue({ slug: 'bby-5', status: 'done' })
    getQuote.mockResolvedValue(null)
    listQuotes.mockResolvedValue([{ n: 20, slug: 'bby-20', src: '/20.jpg' }])

    const picked = await pickQuoteForEmailCron()
    expect(picked).toEqual({
      source: 'latest_public',
      quote: expect.objectContaining({ slug: 'bby-20' }),
    })
  })

  it('skips when no public quote', async () => {
    findEarliestDoneScheduleForUtcDay.mockResolvedValue(null)
    listQuotes.mockResolvedValue([])
    await expect(runQuoteEmailCron()).resolves.toEqual({ skipped: true, reason: 'no_quote' })
    expect(notifyQuoteSubscribers).not.toHaveBeenCalled()
  })

  it('notifies subscribers and reports source', async () => {
    findEarliestDoneScheduleForUtcDay.mockResolvedValue({ slug: 'bby-5', status: 'done' })
    getQuote.mockResolvedValue({ n: 5, slug: 'bby-5', src: '/q.jpg', text: 'Hi' })
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
    expect(result).toMatchObject({
      skipped: false,
      slug: 'bby-5',
      source: 'social_schedule',
      sent: 2,
      total: 2,
    })
  })
})
