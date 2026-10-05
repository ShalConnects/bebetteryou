/**
 * @jest-environment node
 */

jest.mock('@/libs/mongo', () => ({
  connectDB: jest.fn(),
}))

jest.mock('@/libs/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
}))

jest.mock('@/libs/newsletter', () => ({
  unsubscribeNewsletterSubscriber: jest.fn(),
}))

jest.mock('@/models/NewsletterDeliveryEvent', () => ({
  __esModule: true,
  default: {
    aggregate: jest.fn(),
  },
}))

import NewsletterDeliveryEvent from '@/models/NewsletterDeliveryEvent'
import { unsubscribeNewsletterSubscriber } from '@/libs/newsletter'
import {
  cleanupSuppressedNewsletterSubscribers,
  listLocalDeliveryBadEmails,
} from '@/libs/newsletter-cleanup'

describe('newsletter cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    process.env.RESEND_API_KEY = 're_test'
  })

  afterEach(() => {
    delete global.fetch
  })

  it('lists distinct local bounced/complained emails', async () => {
    NewsletterDeliveryEvent.aggregate.mockResolvedValue([
      { _id: 'A@Ex.com' },
      { _id: 'b@ex.com' },
    ])
    await expect(listLocalDeliveryBadEmails()).resolves.toEqual(['a@ex.com', 'b@ex.com'])
  })

  it('unsubscribes unique Resend + local bad addresses', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        object: 'list',
        has_more: false,
        data: [
          { id: '1', email: 'bounce@ex.com', origin: 'bounce' },
          { id: '2', email: 'spam@ex.com', origin: 'complaint' },
          { id: '3', email: 'manual@ex.com', origin: 'manual' },
        ],
      }),
    })
    NewsletterDeliveryEvent.aggregate.mockResolvedValue([{ _id: 'bounce@ex.com' }, { _id: 'local@ex.com' }])
    unsubscribeNewsletterSubscriber
      .mockResolvedValueOnce({ ok: true, already: false })
      .mockResolvedValueOnce({ ok: true, already: true })
      .mockResolvedValueOnce({ ok: false })

    const result = await cleanupSuppressedNewsletterSubscribers()
    expect(result).toMatchObject({
      resendCount: 2,
      localCount: 2,
      unique: 3,
      unsubscribed: 1,
      already: 1,
      missing: 1,
    })
    expect(unsubscribeNewsletterSubscriber).toHaveBeenCalledWith('bounce@ex.com')
    expect(unsubscribeNewsletterSubscriber).toHaveBeenCalledWith('spam@ex.com')
    expect(unsubscribeNewsletterSubscriber).toHaveBeenCalledWith('local@ex.com')
  })
})
