import {
  failedResults,
  isScheduleFailure,
  formatScheduleWhen,
  manageQuotesHref,
  networkStates,
  nextRunDay,
  coveredDays,
  slotStatus,
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
    jest.useFakeTimers().setSystemTime(new Date('2026-09-30T00:00:00Z')) // inside the 21-day window
    expect(scheduleFailures(rows).map((r) => r.slug)).toEqual(['bby-7'])
    jest.useRealTimers()
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

describe('calendar helpers', () => {
  const now = Date.parse('2026-10-29T14:30:00Z') // 20:30 Dhaka, inside the cron hour
  const pending = (runAt) => ({ status: 'pending', runAt })

  it('waits out the cron hour before calling a post overdue', () => {
    expect(slotStatus(pending('2026-10-29T14:00:00Z'), now)).toBe('scheduled')
    expect(slotStatus(pending('2026-10-28T14:00:00Z'), now)).toBe('overdue')
  })

  it('marks done rows with open failures as partial', () => {
    const row = { status: 'done', slug: 'a', results: [{ id: 'x', ok: false }] }
    expect(slotStatus(row, now)).toBe('partial')
    expect(slotStatus(row, now, { a: { x: { ok: true } } })).toBe('posted')
  })

  it('puts missed posts on the next run day', () => {
    expect(nextRunDay(now)).toBe('2026-10-30')
    expect(nextRunDay(Date.parse('2026-10-29T08:00:00Z'))).toBe('2026-10-29')
  })

  it('counts days with a pending post, once per day', () => {
    const rows = [
      pending('2026-10-28T14:00:00Z'), // overdue → next run, Fri 30
      pending('2026-10-30T14:00:00Z'),
      pending('2026-11-01T14:00:00Z'),
      pending('2026-11-10T14:00:00Z'), // outside the week
      { status: 'done', runAt: '2026-10-31T14:00:00Z' },
    ]
    expect(coveredDays(rows, 7, now)).toBe(2)
  })

  it('formats the same way in Node and browsers', () => {
    expect(formatScheduleWhen('2026-10-26T14:00:00Z')).toBe('Mon 26 Oct, 8:00 pm')
    expect(manageQuotesHref({ section: 'new', date: '2026-11-01' })).toBe('/dashboard/quotes?date=2026-11-01&section=new')
  })

  it('reads each network outcome, letting a later post clear a failure', () => {
    const row = { slug: 'a', networks: ['x', 'y', 'z'], results: [{ id: 'x', ok: true }, { id: 'y', ok: false, error: 'token' }] }
    expect(networkStates(row).map((n) => n.state)).toEqual(['ok', 'failed', 'waiting'])
    expect(networkStates(row, { a: { y: { ok: true } } })[1].state).toBe('ok')
  })
})
