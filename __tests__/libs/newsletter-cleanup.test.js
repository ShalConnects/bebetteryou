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

jest.mock('@/libs/resend-webhook', () => ({
  upsertNewsletterDeliveryEvent: jest.fn(),
}))

jest.mock('@/models/NewsletterDeliveryEvent', () => ({
  __esModule: true,
  default: {
    aggregate: jest.fn(),
  },
}))

import NewsletterDeliveryEvent from '@/models/NewsletterDeliveryEvent'
import { unsubscribeNewsletterSubscriber } from '@/libs/newsletter'
import { upsertNewsletterDeliveryEvent } from '@/libs/resend-webhook'
import {
  cleanupSuppressedNewsletterSubscribers,
  listLocalDeliveryBadEmails,
} from '@/libs/newsletter-cleanup'

describe('newsletter cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    process.env.RESEND_API_KEY = 're_test'
    upsertNewsletterDeliveryEvent.mockResolvedValue({})
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

  it('unsubscribes unique Resend + local bad addresses and upserts events', async () => {
    global.fetch.mockImplementation(async (url) => {
      const href = String(url)
      if (href.includes('/suppressions')) {
        return {
          ok: true,
          json: async () => ({
            object: 'list',
            has_more: false,
            data: [
              { id: '1', email: 'bounce@ex.com', origin: 'bounce', source_id: 'e1' },
              { id: '2', email: 'spam@ex.com', origin: 'complaint', source_id: 'e2' },
              { id: '3', email: 'manual@ex.com', origin: 'manual' },
            ],
          }),
        }
      }
      if (href.includes('/emails')) {
        return {
          ok: true,
          json: async () => ({
            object: 'list',
            has_more: false,
            data: [
              {
                id: 'e3',
                to: ['soft@ex.com'],
                last_event: 'bounced',
                subject: 'Quote',
                created_at: '2026-10-14T15:00:00.000Z',
              },
            ],
          }),
        }
      }
      if (href.endsWith('/webhooks')) {
        return {
          ok: true,
          json: async () => ({
            object: 'list',
            has_more: false,
            data: [{ id: 'wh_1', events: ['email.bounced', 'email.complained'] }],
          }),
        }
      }
      if (href.includes('/webhooks/wh_1/events?') || href.endsWith('/webhooks/wh_1/events')) {
        return {
          ok: true,
          json: async () => ({
            object: 'list',
            has_more: false,
            data: [{ id: 'msg_1', type: 'email.bounced', created_at: '2026-10-14T15:00:00.000Z' }],
          }),
        }
      }
      if (href.includes('/webhooks/wh_1/events/msg_1')) {
        return {
          ok: true,
          json: async () => ({
            object: 'webhook_event',
            payload: {
              type: 'email.bounced',
              data: {
                email_id: 'e1',
                to: ['bounce@ex.com'],
                bounce: { type: 'Permanent', subType: 'General', message: 'gone' },
              },
            },
          }),
        }
      }
      return { ok: true, json: async () => ({ object: 'list', has_more: false, data: [] }) }
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
    expect(result.eventsUpserted).toBeGreaterThan(0)
    expect(upsertNewsletterDeliveryEvent).toHaveBeenCalled()
    expect(unsubscribeNewsletterSubscriber).toHaveBeenCalledWith('bounce@ex.com')
    expect(unsubscribeNewsletterSubscriber).toHaveBeenCalledWith('spam@ex.com')
    expect(unsubscribeNewsletterSubscriber).toHaveBeenCalledWith('local@ex.com')
  })
})
