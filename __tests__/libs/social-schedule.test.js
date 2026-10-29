/**
 * @jest-environment node
 */
import fs from 'fs'
import os from 'os'
import path from 'path'

function seedQuote(slug, status = 'draft') {
  fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true })
  const file = path.join(process.cwd(), 'data/quotes.json')
  const quotes = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []
  const n = Number(String(slug).replace(/\D/g, '')) || quotes.length + 1
  quotes.push({
    slug,
    n,
    src: `/quotes/${slug}.jpg`,
    text: `Quote ${slug}`,
    author: '',
    tags: [],
    rev: 6,
    status,
  })
  fs.writeFileSync(file, JSON.stringify(quotes, null, 2))
}

function readQuote(slug) {
  const quotes = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/quotes.json'), 'utf8'))
  return quotes.find((q) => q.slug === slug)
}

describe('social schedule store (local)', () => {
  let dir
  let store

  beforeEach(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bby-sched-'))
    process.chdir(dir)
    delete process.env.MONGODB_URI
    delete process.env.VERCEL
    jest.resetModules()
    seedQuote('bby-1')
    seedQuote('bby-2')
    seedQuote('bby-partial')
    seedQuote('bby-dup')
    store = await import('@/libs/social/schedule-store')
  })

  afterEach(() => {
    process.chdir('/')
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('creates, claims, and finishes a due schedule', async () => {
    const created = await store.createSchedule({
      slug: 'bby-1',
      networks: ['bluesky', 'telegram'],
      runAt: new Date(Date.now() + 120_000).toISOString(),
    })
    expect(created.status).toBe('pending')
    expect(created.networks).toEqual(['bluesky', 'telegram'])
    expect(readQuote('bby-1').status).toBe('scheduled')

    const early = await store.claimDueSchedules(new Date(), 5)
    expect(early).toHaveLength(0)

    const due = await store.claimDueSchedules(new Date(Date.now() + 180_000), 5)
    expect(due).toHaveLength(1)
    expect(due[0].status).toBe('running')

    const done = await store.finishSchedule(created.id, {
      ok: true,
      results: [{ id: 'bluesky', ok: true }],
    })
    expect(done.status).toBe('done')

    const listed = await store.listSchedules('bby-1')
    expect(listed[0].status).toBe('done')
  })

  it('keeps partial network failures on a done schedule', async () => {
    const created = await store.createSchedule({
      slug: 'bby-partial',
      networks: ['bluesky', 'threads'],
      runAt: new Date(Date.now() + 120_000).toISOString(),
    })
    await store.claimDueSchedules(new Date(Date.now() + 180_000), 5)
    const done = await store.finishSchedule(created.id, {
      ok: true,
      results: [
        { id: 'bluesky', ok: true },
        { id: 'threads', ok: false, error: 'An unexpected error has occurred.' },
      ],
      error: 'threads: An unexpected error has occurred.',
    })
    expect(done.status).toBe('done')
    expect(done.error).toContain('threads:')
    expect(done.results.filter((r) => !r.ok)).toHaveLength(1)
  })

  it('rejects a second pending schedule for the same slug', async () => {
    await store.createSchedule({
      slug: 'bby-dup',
      networks: ['bluesky'],
      runAt: new Date(Date.now() + 3600_000).toISOString(),
    })
    await expect(
      store.createSchedule({
        slug: 'bby-dup',
        networks: ['telegram'],
        runAt: new Date(Date.now() + 7200_000).toISOString(),
      })
    ).rejects.toThrow(/pending schedule already exists/i)
  })

  it('cancels a pending schedule and returns draft quotes to draft', async () => {
    const created = await store.createSchedule({
      slug: 'bby-2',
      networks: ['x'],
      runAt: new Date(Date.now() + 3600_000).toISOString(),
    })
    expect(readQuote('bby-2').status).toBe('scheduled')
    const canceled = await store.cancelSchedule(created.id)
    expect(canceled.status).toBe('canceled')
    expect(readQuote('bby-2').status).toBe('draft')
  })

  it('does not unpublish an already-public quote when scheduling social', async () => {
    seedQuote('bby-live', 'published')
    await store.createSchedule({
      slug: 'bby-live',
      networks: ['bluesky'],
      runAt: new Date(Date.now() + 3600_000).toISOString(),
    })
    expect(readQuote('bby-live').status).toBe('published')
  })

  it('records an immediate successful post as done for the email cron', async () => {
    const now = new Date('2026-09-21T12:00:00.000Z')
    const recorded = await store.recordDoneSocialSend({
      slug: 'bby-9',
      networks: ['telegram'],
      results: [{ id: 'telegram', ok: true }],
      runAt: now,
    })
    expect(recorded.status).toBe('done')
    expect(recorded.slug).toBe('bby-9')

    const found = await store.findEarliestDoneScheduleForUtcDay(now)
    expect(found.slug).toBe('bby-9')
    expect(found.status).toBe('done')
  })

  it('does not record immediate post when every network failed', async () => {
    const recorded = await store.recordDoneSocialSend({
      slug: 'bby-10',
      results: [{ id: 'x', ok: false, error: 'fail' }],
      runAt: new Date(),
    })
    expect(recorded).toBeNull()
  })

  it('listAllSchedules keeps pending when many done rows exist', async () => {
    const file = path.join(process.cwd(), 'data/social-schedules.json')
    const done = Array.from({ length: 12 }, (_, i) => ({
      id: `done-${i}`,
      slug: `bby-done-${i}`,
      networks: ['telegram'],
      runAt: new Date(Date.UTC(2026, 0, i + 1, 14)).toISOString(),
      status: 'done',
      results: [{ id: 'telegram', ok: true }],
    }))
    const pending = {
      id: 'pending-1',
      slug: 'bby-1',
      networks: ['bluesky'],
      runAt: new Date(Date.UTC(2026, 11, 1, 14)).toISOString(),
      status: 'pending',
    }
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify([...done, pending], null, 2))

    const listed = await store.listAllSchedules({ limit: 5 })
    expect(listed.filter((r) => r.status === 'pending').map((r) => r.slug)).toEqual(['bby-1'])
    const recent = listed.filter((r) => r.status !== 'pending')
    expect(recent).toHaveLength(5)
    expect(recent.map((r) => r.slug)).toEqual([
      'bby-done-11',
      'bby-done-10',
      'bby-done-9',
      'bby-done-8',
      'bby-done-7',
    ])
  })
})
