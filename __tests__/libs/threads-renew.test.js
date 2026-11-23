/**
 * @jest-environment node
 */
const store = { doc: null, saved: [] }
jest.mock('@/libs/integrations/credentials', () => ({ resolveThreadsKeys: async () => ({ token: 'old', userId: '1' }) }))
jest.mock('@/libs/integrations/store', () => ({
  getIntegration: async () => store.doc,
  saveIntegration: async (_, patch) => store.saved.push(patch),
}))

import { renewThreadsToken } from '@/libs/social/providers/threads'

const now = new Date('2026-11-30T14:00:00Z')
const daysAgo = (d) => ({ extras: { renewedAt: new Date(now - d * 86_400_000).toISOString() } })

beforeEach(() => {
  store.saved = []
  global.fetch = jest.fn(async () => ({ status: 200, json: async () => ({ access_token: 'new' }) }))
})

describe('renewThreadsToken', () => {
  it('starts the clock the first time, then waits a week', async () => {
    store.doc = null
    expect(await renewThreadsToken(now)).toBe('clock_started')
    store.doc = daysAgo(3)
    expect(await renewThreadsToken(now)).toBe('fresh')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('renews after a week and saves the new token', async () => {
    store.doc = daysAgo(8)
    expect(await renewThreadsToken(now)).toBe('renewed')
    expect(store.saved[0]).toMatchObject({ accessToken: 'new', lastError: '' })
  })

  it('records a failure for the dashboard', async () => {
    store.doc = daysAgo(8)
    fetch.mockResolvedValueOnce({ status: 400, json: async () => ({ error: { message: 'expired' } }) })
    await expect(renewThreadsToken(now)).rejects.toThrow(/expired/)
    expect(store.saved[0].lastError).toMatch(/paste a new token/)
  })
})
