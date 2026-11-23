/**
 * @jest-environment node
 */
const stopped = []
jest.mock('node:dns/promises', () => ({
  resolveMx: async (d) => {
    if (d === 'live.com') return [{ exchange: 'mx.live.com' }]
    if (d === 'slow.com') throw Object.assign(new Error('t'), { code: 'ETIMEOUT' })
    throw Object.assign(new Error('x'), { code: d === 'gone.com' || d === 'all.dead' ? 'ENOTFOUND' : 'ENODATA' })
  },
}))
jest.mock('@/libs/shal-outreach/store.js', () => ({ addUnsubscribe: async (e, r) => stopped.push([e, r]) }))
jest.mock('@/libs/shal-outreach/deliver.js', () => ({}))
jest.mock('@/libs/secret', () => ({}))

import { mailable } from '@/libs/shal-outreach/run'

describe('outreach mailable', () => {
  it('keeps live domains, stops dead ones, skips timeouts for today', async () => {
    const out = await mailable([{ email: 'a@live.com' }, { email: 'b@gone.com' }, { email: 'c@slow.com' }])
    expect(out.map((p) => p.email)).toEqual(['a@live.com'])
    expect(stopped).toEqual([['b@gone.com', 'no-mail-server']])
  })

  it('refuses to stop anyone when every lookup fails', async () => {
    stopped.length = 0
    await expect(mailable([{ email: 'x@all.dead' }])).rejects.toThrow(/lookup failed/)
    expect(stopped).toEqual([])
  })
})
