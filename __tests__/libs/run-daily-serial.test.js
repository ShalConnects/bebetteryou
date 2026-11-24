/**
 * @jest-environment node
 */
const posted = {}
jest.mock('@/libs/social', () => ({
  readyNetworks: jest.fn(async () => [{ id: 'x', ready: true }]),
  postQuote: jest.fn(async (slug, [id]) => [{ id, ok: true }]),
}))
jest.mock('@/libs/quotes-store', () => ({
  readQuotes: jest.fn(async () => [3, 1, 2].map((n) => ({ slug: `bby-${n}`, n, status: 'published', src: 'x.jpg', text: 't' }))),
}))
jest.mock('@/libs/social/post-store', () => ({
  readPostsBySlugs: jest.fn(async () => posted),
  hasOkNetworkPostInUtcDay: jest.fn(async () => false),
}))

import { runDailySerial } from '@/libs/social/run-daily-serial'
import { postQuote } from '@/libs/social'
import { hasOkNetworkPostInUtcDay } from '@/libs/social/post-store'

test('posts the lowest card number not yet on X', async () => {
  posted['bby-1'] = { x: { ok: true } }
  const out = await runDailySerial()
  expect(postQuote).toHaveBeenCalledWith('bby-2', ['x'])
  expect(out.x).toMatchObject({ slug: 'bby-2', ok: true, left: 1 })
})

test('never two in a day', async () => {
  hasOkNetworkPostInUtcDay.mockResolvedValueOnce(true)
  postQuote.mockClear()
  expect((await runDailySerial()).x.reason).toBe('already_posted_today')
  expect(postQuote).not.toHaveBeenCalled()
})
