import {
  failedResults,
  isScheduleFailure,
  manageQuotesHref,
  networkLastActivity,
  scheduleFailures,
  upcomingPending,
} from '@/libs/dashboard-ops'

describe('dashboard-ops', () => {
  const rows = [
    {
      id: '1',
      slug: 'bby-7',
      status: 'done',
      runAt: '2026-09-26T14:00:00.000Z',
      error: 'threads: fail',
      results: [
        { id: 'instagram', ok: true },
        { id: 'threads', ok: false, error: 'fail' },
      ],
    },
    {
      id: '2',
      slug: 'bby-8',
      status: 'pending',
      runAt: '2026-09-28T14:00:00.000Z',
      results: [],
    },
  ]

  it('detects partial failures', () => {
    expect(failedResults(rows[0])).toHaveLength(1)
    expect(isScheduleFailure(rows[0])).toBe(true)
    expect(scheduleFailures(rows).map((r) => r.slug)).toEqual(['bby-7'])
  })

  it('hides failures once the network later posted ok', () => {
    const postsBySlug = { 'bby-7': { threads: { ok: true } } }
    expect(failedResults(rows[0], postsBySlug)).toHaveLength(0)
    expect(isScheduleFailure(rows[0], postsBySlug)).toBe(false)
    expect(scheduleFailures(rows, { postsBySlug })).toEqual([])
  })

  it('lists upcoming and last network activity', () => {
    expect(upcomingPending(rows, 3).map((r) => r.slug)).toEqual(['bby-8'])
    expect(networkLastActivity(rows).threads).toMatchObject({ ok: false, slug: 'bby-7' })
  })

  it('builds manage quote deep links', () => {
    expect(manageQuotesHref({ quote: 'bby-7', retry: ['threads'], section: 'cards' })).toBe(
      '/dashboard/quotes?quote=bby-7&retry=threads&section=cards'
    )
  })
})
