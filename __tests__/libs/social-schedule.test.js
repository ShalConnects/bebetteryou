/**
 * @jest-environment node
 */
import fs from 'fs'
import os from 'os'
import path from 'path'

describe('social schedule store (local)', () => {
  let dir
  let store

  beforeEach(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bby-sched-'))
    process.chdir(dir)
    delete process.env.MONGODB_URI
    delete process.env.VERCEL
    jest.resetModules()
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

  it('cancels a pending schedule', async () => {
    const created = await store.createSchedule({
      slug: 'bby-2',
      networks: ['x'],
      runAt: new Date(Date.now() + 3600_000).toISOString(),
    })
    const canceled = await store.cancelSchedule(created.id)
    expect(canceled.status).toBe('canceled')
  })
})
