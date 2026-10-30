/**
 * @jest-environment node
 */

jest.mock('@/libs/content', () => ({
  getQuote: jest.fn(),
  listQuotes: jest.fn(async () => []),
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
  findEmailCandidateSchedulesForUtcDay: jest.fn(),
  utcDayRange: jest.requireActual('@/libs/social/schedule-store').utcDayRange,
}))

import { getQuote, listQuotes } from '@/libs/content'
import { notifyQuoteSubscribers } from '@/libs/newsletter'
import { pickQuoteForEmailCron, runQuoteEmailCron } from '@/libs/newsletter-cron'
import { findEmailCandidateSchedulesForUtcDay } from '@/libs/social/schedule-store'

describe('newsletter cron', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    listQuotes.mockResolvedValue([])
  })

  it('uses today social schedule slug when done', async () => {
    findEmailCandidateSchedulesForUtcDay.mockResolvedValue([
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

  it('still emails when today social finished as failed', async () => {
    findEmailCandidateSchedulesForUtcDay.mockResolvedValue([
      {
        slug: 'bby-5',
        status: 'failed',
        runAt: '2026-09-21T14:00:00.000Z',
        results: [{ id: 'pinterest', ok: false, error: 'Authentication failed.' }],
      },
    ])
    getQuote.mockResolvedValue({ n: 5, slug: 'bby-5', src: '/5.jpg', text: 'Five' })
    notifyQuoteSubscribers.mockResolvedValue({ total: 1, sent: 1, failed: 0, eligible: 50 })

    const result = await runQuoteEmailCron(new Date('2026-09-21T15:00:00.000Z'))
    expect(result).toMatchObject({ skipped: false, slug: 'bby-5', source: 'social_schedule_failed' })
    expect(notifyQuoteSubscribers).toHaveBeenCalledWith(expect.objectContaining({ slug: 'bby-5' }))
  })

  it('falls back to a quote published today when no schedule', async () => {
    findEmailCandidateSchedulesForUtcDay.mockResolvedValue([])
    listQuotes.mockResolvedValue([
      { n: 4, slug: 'bby-4', src: '/4.jpg', publishAt: '2026-09-20T14:00:00.000Z' },
      { n: 5, slug: 'bby-5', src: '/5.jpg', publishAt: '2026-09-21T14:05:00.000Z' },
    ])

    const picked = await pickQuoteForEmailCron(new Date('2026-09-21T15:00:00.000Z'))
    expect(picked).toEqual({
      source: 'published_today',
      quote: expect.objectContaining({ slug: 'bby-5' }),
    })
  })

  it('skips when nothing ran or published today', async () => {
    findEmailCandidateSchedulesForUtcDay.mockResolvedValue([])
    listQuotes.mockResolvedValue([{ n: 4, slug: 'bby-4', src: '/4.jpg', publishAt: '2026-09-20T14:00:00.000Z' }])
    await expect(pickQuoteForEmailCron(new Date('2026-09-21T15:00:00.000Z'))).resolves.toBeNull()
    await expect(runQuoteEmailCron(new Date('2026-09-21T15:00:00.000Z'))).resolves.toEqual({
      skipped: true,
      reason: 'no_quote_today',
    })
    expect(notifyQuoteSubscribers).not.toHaveBeenCalled()
  })

  it('picks the strongest done card over a failed one', async () => {
    findEmailCandidateSchedulesForUtcDay.mockResolvedValue([
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
      {
        slug: 'bby-9',
        status: 'failed',
        runAt: '2026-09-21T14:30:00.000Z',
        results: [],
      },
    ])
    getQuote.mockImplementation(async (slug) => ({ n: Number(slug.split('-')[1]), slug, src: '/q.jpg', text: 'Hi' }))
    notifyQuoteSubscribers.mockResolvedValue({ total: 1, sent: 1, failed: 0, eligible: 50 })
    const result = await runQuoteEmailCron(new Date('2026-09-21T15:00:00.000Z'))
    expect(notifyQuoteSubscribers).toHaveBeenCalledWith(expect.objectContaining({ slug: 'bby-5' }))
    expect(result).toMatchObject({ skipped: false, slug: 'bby-5', source: 'social_schedule' })
  })
})
