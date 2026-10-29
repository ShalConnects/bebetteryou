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

jest.mock('@/libs/newsletter-cleanup', () => ({
  cleanupSuppressedNewsletterSubscribers: jest.fn(),
}))

jest.mock('@/libs/social/schedule-store', () => ({
  findDoneSchedulesForUtcDay: jest.fn(),
}))

import { getQuote } from '@/libs/content'
import { notifyQuoteSubscribers } from '@/libs/newsletter'
import { pickQuoteForEmailCron, runQuoteEmailCron } from '@/libs/newsletter-cron'
import { findDoneSchedulesForUtcDay } from '@/libs/social/schedule-store'

describe('newsletter cron', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('uses today social schedule slug when done', async () => {
    findDoneSchedulesForUtcDay.mockResolvedValue([
      {
        slug: 'bby-5',
        status: 'done',
        runAt: '2026-09-21T14:00:00.000Z',
        results: [{ id: 'telegram', ok: true }],
      },
    ])
    getQuote.mockResolvedValue({ n: 5, slug: 'bby-5', src: '/5.jpg', text: 'Five' })

    const picked = await pickQuoteForEmailCron(new Date('2026-09-21T15:00:00.000Z'))
    expect(picked).toEqual({
      source: 'social_schedule',
      quote: expect.objectContaining({ slug: 'bby-5', n: 5 }),
    })
    expect(getQuote).toHaveBeenCalledWith('bby-5')
  })

  it('skips when no successful social send today', async () => {
    findDoneSchedulesForUtcDay.mockResolvedValue([])
    await expect(pickQuoteForEmailCron(new Date('2026-09-21T15:00:00.000Z'))).resolves.toBeNull()
    await expect(runQuoteEmailCron()).resolves.toEqual({ skipped: true, reason: 'no_social_send' })
    expect(notifyQuoteSubscribers).not.toHaveBeenCalled()
  })

  it('skips when social slug is not a usable public quote', async () => {
    findDoneSchedulesForUtcDay.mockResolvedValue([{ slug: 'bby-5', status: 'done', results: [] }])
    getQuote.mockResolvedValue(null)
    await expect(pickQuoteForEmailCron()).resolves.toBeNull()
    expect(notifyQuoteSubscribers).not.toHaveBeenCalled()
  })

  it('picks the strongest social card when several finished today', async () => {
    findDoneSchedulesForUtcDay.mockResolvedValue([
      {
        slug: 'bby-1',
        status: 'done',
        runAt: '2026-09-21T03:00:00.000Z',
        results: [{ id: 'linkedin', ok: true }],
      },
      {
        slug: 'bby-5',
        status: 'done',
        runAt: '2026-09-21T14:00:00.000Z',
        results: [
          { id: 'instagram', ok: true },
          { id: 'telegram', ok: true },
          { id: 'pinterest', ok: false },
        ],
      },
    ])
    getQuote.mockImplementation(async (slug) => ({ n: slug === 'bby-5' ? 5 : 1, slug, src: '/q.jpg', text: 'Hi' }))
    notifyQuoteSubscribers.mockResolvedValue({
      total: 1,
      sent: 1,
      failed: 0,
      eligible: 50,
    })
    const result = await runQuoteEmailCron(new Date('2026-09-21T15:00:00.000Z'))
    expect(notifyQuoteSubscribers).toHaveBeenCalledWith(expect.objectContaining({ slug: 'bby-5' }))
    expect(result).toMatchObject({
      skipped: false,
      slug: 'bby-5',
      source: 'social_schedule',
      sent: 1,
    })
  })
})
