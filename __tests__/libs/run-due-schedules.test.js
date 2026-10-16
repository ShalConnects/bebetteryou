/**
 * @jest-environment node
 */
import fs from 'fs'
import os from 'os'
import path from 'path'

jest.mock('@/libs/social', () => ({
  postQuote: jest.fn(async () => [{ id: 'bluesky', ok: true, url: 'https://example.com' }]),
  readyNetworks: jest.fn(async () => [{ id: 'bluesky', label: 'Bluesky', ready: true }]),
}))

jest.mock('@/libs/social/post-store', () => ({
  readPosts: jest.fn(async () => ({})),
}))

describe('runDueSocialSchedules', () => {
  let dir

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bby-due-'))
    process.chdir(dir)
    delete process.env.MONGODB_URI
    delete process.env.VERCEL
    jest.resetModules()
    fs.mkdirSync(path.join(dir, 'data'), { recursive: true })
    fs.writeFileSync(
      path.join(dir, 'data/quotes.json'),
      JSON.stringify(
        [
          {
            slug: 'bby-7',
            n: 7,
            src: '/quotes/bby7.jpg',
            text: 'Seven',
            author: '',
            tags: [],
            rev: 6,
            status: 'draft',
          },
        ],
        null,
        2
      )
    )
  })

  afterEach(() => {
    process.chdir('/')
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('publishes the quote to the site before posting social', async () => {
    const store = await import('@/libs/social/schedule-store')
    const { runDueSocialSchedules } = await import('@/libs/social/run-due-schedules')

    await store.createSchedule({
      slug: 'bby-7',
      networks: ['bluesky'],
      runAt: new Date(Date.now() + 60_000).toISOString(),
    })
    expect(JSON.parse(fs.readFileSync('data/quotes.json', 'utf8'))[0].status).toBe('scheduled')

    const result = await runDueSocialSchedules({ now: new Date(Date.now() + 120_000), limit: 5 })
    expect(result.claimed).toBe(1)
    expect(result.outcomes[0].ok).toBe(true)
    expect(JSON.parse(fs.readFileSync('data/quotes.json', 'utf8'))[0].status).toBe('published')
  })

  it('requeues when some networks succeed and others fail', async () => {
    const social = await import('@/libs/social')
    social.postQuote.mockImplementationOnce(async () => [
      { id: 'bluesky', ok: true, url: 'https://bsky.app/1' },
      { id: 'youtube', ok: false, error: 'Token has been expired or revoked.' },
    ])
    social.readyNetworks.mockImplementationOnce(async () => [
      { id: 'bluesky', label: 'Bluesky', ready: true },
      { id: 'youtube', label: 'YouTube Shorts', ready: true },
    ])

    const store = await import('@/libs/social/schedule-store')
    const { runDueSocialSchedules } = await import('@/libs/social/run-due-schedules')

    await store.createSchedule({
      slug: 'bby-7',
      networks: ['bluesky', 'youtube'],
      runAt: new Date(Date.now() + 60_000).toISOString(),
    })

    const result = await runDueSocialSchedules({ now: new Date(Date.now() + 120_000), limit: 5 })
    expect(result.outcomes[0].partial).toBe(true)
    expect(result.outcomes[0].ok).toBe(false)
    const rows = JSON.parse(fs.readFileSync('data/social-schedules.json', 'utf8'))
    expect(rows[0].status).toBe('pending')
    expect(rows[0].error).toContain('youtube')
  })
})
