/**
 * @jest-environment node
 */
import fs from 'fs'
import os from 'os'
import path from 'path'

jest.mock('@/libs/social', () => ({
  postQuote: jest.fn(async () => [
    { id: 'youtube', label: 'YouTube Shorts', ok: true, url: 'https://youtu.be/x' },
  ]),
  readyNetworks: jest.fn(async () => [
    { id: 'youtube', label: 'YouTube Shorts', ready: true },
  ]),
}))

describe('run-daily-youtube-short', () => {
  let dir
  let prevDaily

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bby-yt-daily-'))
    process.chdir(dir)
    delete process.env.MONGODB_URI
    delete process.env.VERCEL
    prevDaily = process.env.YOUTUBE_DAILY_SHORTS
    delete process.env.YOUTUBE_DAILY_SHORTS
    jest.resetModules()
    fs.mkdirSync(path.join(dir, 'data'), { recursive: true })
    fs.writeFileSync(
      path.join(dir, 'data/quotes.json'),
      JSON.stringify(
        [
          {
            slug: 'bby-3',
            n: 3,
            src: '/quotes/bby3.jpg',
            text: 'Three',
            author: '',
            tags: [],
            status: 'published',
          },
          {
            slug: 'bby-1',
            n: 1,
            src: '/quotes/bby1.jpg',
            text: 'One',
            author: '',
            tags: [],
            status: 'published',
          },
          {
            slug: 'bby-2',
            n: 2,
            src: '/quotes/bby2.jpg',
            text: 'Two',
            author: '',
            tags: [],
            status: 'draft',
          },
          {
            slug: 'week-2026-10-17',
            n: 99,
            src: '/quotes/week.jpg',
            text: 'Week',
            author: '',
            tags: [],
            status: 'published',
          },
        ],
        null,
        2
      )
    )
    fs.writeFileSync(path.join(dir, 'data/social-posts.json'), '[]')
  })

  afterEach(() => {
    if (prevDaily === undefined) delete process.env.YOUTUBE_DAILY_SHORTS
    else process.env.YOUTUBE_DAILY_SHORTS = prevDaily
    process.chdir('/')
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('picks oldest public quote without youtube.ok and skips drafts / week-review', async () => {
    const {
      pickNextQuoteForYoutubeShort,
      countYoutubeShortsBacklog,
    } = await import('@/libs/social/run-daily-youtube-short')
    const quotes = JSON.parse(fs.readFileSync('data/quotes.json', 'utf8'))
    expect(pickNextQuoteForYoutubeShort(quotes, {}).slug).toBe('bby-1')
    expect(countYoutubeShortsBacklog(quotes, {})).toBe(2)

    const posts = { 'bby-1': { youtube: { ok: true } } }
    expect(pickNextQuoteForYoutubeShort(quotes, posts).slug).toBe('bby-3')
    expect(countYoutubeShortsBacklog(quotes, posts)).toBe(1)
  })

  it('posts youtube-only for the next backlog quote', async () => {
    const social = await import('@/libs/social')
    const { runDailyYoutubeShort } = await import('@/libs/social/run-daily-youtube-short')
    const result = await runDailyYoutubeShort({ now: new Date('2026-10-19T19:00:00.000Z') })
    expect(result.skipped).toBe(false)
    expect(result.ok).toBe(true)
    expect(result.slug).toBe('bby-1')
    expect(social.postQuote).toHaveBeenCalledWith('bby-1', ['youtube'])
  })

  it('skips when disabled or already posted today', async () => {
    process.env.YOUTUBE_DAILY_SHORTS = '0'
    jest.resetModules()
    let mod = await import('@/libs/social/run-daily-youtube-short')
    expect((await mod.runDailyYoutubeShort()).reason).toBe('disabled')

    delete process.env.YOUTUBE_DAILY_SHORTS
    jest.resetModules()
    fs.writeFileSync(
      path.join(dir, 'data/social-posts.json'),
      JSON.stringify([
        {
          slug: 'bby-9',
          network: 'youtube',
          ok: true,
          at: '2026-10-19T12:00:00.000Z',
        },
      ])
    )
    mod = await import('@/libs/social/run-daily-youtube-short')
    const result = await mod.runDailyYoutubeShort({ now: new Date('2026-10-19T19:00:00.000Z') })
    expect(result.skipped).toBe(true)
    expect(result.reason).toBe('already_posted_today')
  })

  it('does not treat week-review Short as today blocking', async () => {
    fs.writeFileSync(
      path.join(dir, 'data/social-posts.json'),
      JSON.stringify([
        {
          slug: 'week-2026-10-17',
          network: 'youtube',
          ok: true,
          at: '2026-10-19T12:00:00.000Z',
        },
      ])
    )
    const { runDailyYoutubeShort } = await import('@/libs/social/run-daily-youtube-short')
    const result = await runDailyYoutubeShort({ now: new Date('2026-10-19T19:00:00.000Z') })
    expect(result.skipped).toBe(false)
    expect(result.slug).toBe('bby-1')
  })
})
