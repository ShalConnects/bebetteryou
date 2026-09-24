/**
 * @jest-environment node
 */

jest.mock('@/libs/content', () => ({
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

import { getQuote } from '@/libs/content'
import { notifyQuoteSubscribers } from '@/libs/newsletter'
import { pickQuoteForEmailCron, runQuoteEmailCron } from '@/libs/newsletter-cron'
import { findEarliestDoneScheduleForUtcDay } from '@/libs/social/schedule-store'

describe('newsletter cron', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('uses today social schedule slug when done', async () => {
    findEarliestDoneScheduleForUtcDay.mockResolvedValue({
      slug: 'bby-5',
      status: 'done',
      runAt: '2026-09-21T14:00:00.000Z',
    })
    getQuote.mockResolvedValue({ n: 5, slug: 'bby-5', src: '/5.jpg', text: 'Five' })

    const picked = await pickQuoteForEmailCron(new Date('2026-09-21T15:00:00.000Z'))
    expect(picked).toEqual({
      source: 'social_schedule',
      quote: expect.objectContaining({ slug: 'bby-5', n: 5 }),
    })
    expect(getQuote).toHaveBeenCalledWith('bby-5')
  })

  it('skips when no successful social send today', async () => {
    findEarliestDoneScheduleForUtcDay.mockResolvedValue(null)
    await expect(pickQuoteForEmailCron(new Date('2026-09-21T15:00:00.000Z'))).resolves.toBeNull()
    await expect(runQuoteEmailCron()).resolves.toEqual({ skipped: true, reason: 'no_social_send' })
    expect(notifyQuoteSubscribers).not.toHaveBeenCalled()
  })

  it('skips when social slug is not a usable public quote', async () => {
    findEarliestDoneScheduleForUtcDay.mockResolvedValue({ slug: 'bby-5', status: 'done' })
    getQuote.mockResolvedValue(null)
    await expect(pickQuoteForEmailCron()).resolves.toBeNull()
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
