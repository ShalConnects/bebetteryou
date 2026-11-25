/**
 * @jest-environment node
 */
const posted = {}
jest.mock('@/libs/social', () => ({
  readyNetworks: jest.fn(async () => [{ id: 'x', ready: true }]),
  postQuote: jest.fn(async (slug, [id]) => [{ id, ok: true }]),
}))
jest.mock('@/libs/quotes-store', () => ({
  readQuotes: jest.fn(async () => [4, 3, 1, 2].map((n) => ({ slug: `bby-${n}`, n, status: 'published', src: 'x.jpg', text: 't' }))),
}))
jest.mock('@/libs/social/post-store', () => ({ readPostsBySlugs: jest.fn(async () => posted) }))

import { runDailySerial } from '@/libs/social/run-daily-serial'
import { postQuote } from '@/libs/social'

const now = new Date('2026-11-26T14:00:00Z')
beforeEach(() => postQuote.mockClear())

test('posts the two lowest card numbers not yet on X', async () => {
  posted['bby-1'] = { x: { ok: true, at: '2026-11-24T14:00:00Z' } }
  const out = await runDailySerial({ now })
  expect(postQuote.mock.calls.map(([slug]) => slug)).toEqual(['bby-2', 'bby-3'])
  expect(out.x).toHaveLength(2)
})

test('counts what already went out today: never more than two a day', async () => {
  posted['bby-2'] = { x: { ok: true, at: '2026-11-26T09:00:00Z' } }
  await runDailySerial({ now })
  expect(postQuote.mock.calls.map(([slug]) => slug)).toEqual(['bby-3'])
  posted['bby-3'] = { x: { ok: true, at: '2026-11-26T14:00:01Z' } }
  expect((await runDailySerial({ now })).x.reason).toBe('already_posted_today')
})
