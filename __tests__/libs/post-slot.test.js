import { nextPostDate, runAtFromPostDate } from '@/libs/social/post-slot'

describe('post slot', () => {
  const before = new Date('2026-10-23T13:00:00.000Z')
  const after = new Date('2026-10-23T14:00:00.000Z')

  it('offers today while 14:00 UTC is still ahead', () => {
    expect(nextPostDate(before)).toBe('2026-10-23')
    expect(runAtFromPostDate('2026-10-23', before).toISOString()).toBe('2026-10-23T14:00:00.000Z')
  })

  it('moves to tomorrow once 14:00 UTC has passed, including exactly on the hour', () => {
    expect(nextPostDate(after)).toBe('2026-10-24')
    expect(() => runAtFromPostDate('2026-10-23', after)).toThrow(/already passed/)
    expect(runAtFromPostDate('2026-10-25', after).toISOString()).toBe('2026-10-25T14:00:00.000Z')
  })

  it('pins an ISO timestamp to 14:00 UTC on that UTC date', () => {
    expect(runAtFromPostDate('2026-10-26T09:15:00.000Z', before).toISOString()).toBe('2026-10-26T14:00:00.000Z')
  })

  it('rejects a missing or impossible date', () => {
    expect(() => runAtFromPostDate('', before)).toThrow(/Pick a date/)
    expect(() => runAtFromPostDate('2026-02-31', before)).toThrow(/Pick a date/)
  })
})
