/**
 * @jest-environment node
 */
import fs from 'fs'
import os from 'os'
import path from 'path'
import { buildAss, chunkWords, speechSpans, timeWords } from '@/libs/ray/captions'

jest.mock('@/libs/higgsfield', () => ({
  submitGeneration: jest.fn(async () => 'req-1'),
  generationStatus: jest.fn(),
}))
jest.mock('@/libs/social', () => ({ quoteCaption: jest.fn(), readyNetworks: jest.fn(async () => []) }))

describe('Ray captions', () => {
  const log = 'silence_start: 1.0\nsilence_end: 1.5\nsilence_start: 3.0\nsilence_end: 3.4\n'

  test('speech spans are the gaps between silences', () => {
    expect(speechSpans(log, 4)).toEqual([[0, 1], [1.5, 3], [3.4, 4]])
  })

  test('one pause per sentence pins each sentence to its span', () => {
    const timed = timeWords('You are not behind. Start from here. Today.', speechSpans(log, 4))
    expect(timed.map(([w]) => w)).toEqual(['You', 'are', 'not', 'behind.', 'Start', 'from', 'here.', 'Today.'])
    expect(timed[3][2]).toBeCloseTo(1)
    expect(timed[4][1]).toBeCloseTo(1.5)
    expect(timed[7][1]).toBeCloseTo(3.4)
  })

  test('otherwise words share all the speech, in order', () => {
    const timed = timeWords('One two three four five', speechSpans(log, 4))
    expect(timed).toHaveLength(5)
    expect(timed[4][2]).toBeCloseTo(4)
    timed.forEach(([, a, b], i) => {
      expect(b).toBeGreaterThan(a)
      if (i) expect(a).toBeGreaterThanOrEqual(timed[i - 1][2] - 1e-3)
    })
  })

  test('lines stay short so the lit word never wraps', () => {
    const chunks = chunkWords(timeWords('You are just starting from here today', [[0, 4]]))
    chunks.forEach((c) => {
      expect(c.length).toBeLessThanOrEqual(3)
      expect(c.map(([w]) => w).join(' ').length).toBeLessThanOrEqual(15)
    })
  })

  test('ASS has the hook, the site mark and a lit word per caption event', () => {
    const ass = buildAss({ width: 480, height: 854, duration: 4, hook: 'Whose dream are you watching?', timed: timeWords('Not behind.', [[0, 1]]) })
    expect(ass).toContain('WHOSE DREAM\\NARE YOU\\NWATCHING?')
    expect(ass).toContain('bebetteryou.online')
    expect(ass.match(/,Cap,/g)).toHaveLength(2)
    expect(ass).toContain('\\c&H99D334&')
    expect(ass).toMatch(/Style: Hook,[^,]+,\d+,&H0099D334,/)
  })
})

describe('Ray pipeline', () => {
  let dir
  const now = new Date('2026-11-24T15:00:00Z') // Tue, after the day's run
  const write = (file, data) => fs.writeFileSync(path.join(dir, 'data', file), JSON.stringify(data))

  const home = process.cwd()
  afterEach(() => process.chdir(home))

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bby-ray-'))
    process.chdir(dir)
    delete process.env.MONGODB_URI
    delete process.env.VERCEL
    jest.resetModules()
    fs.mkdirSync(path.join(dir, 'data'))
    write('quotes.json', [41, 43, 44, 45].map((n) => ({ slug: `bby-${n}`, n, src: '', text: `Q${n}`, tags: [], status: 'scheduled' })))
    write('social-schedules.json', [
      ['bby-41', '2026-11-25T14:00:00Z'],
      ['bby-43', '2026-11-28T14:00:00Z'],
      ['bby-44', '2026-11-30T14:00:00Z'],
      ['bby-45', '2026-12-02T14:00:00Z'],
    ].map(([slug, runAt], i) => ({ id: String(i), slug, runAt, networks: ['youtube'], status: 'pending' })))
  })

  test('board lists Ray-day cards with their starter scripts', async () => {
    const { rayBoard } = await import('@/libs/ray/plan')
    const board = await rayBoard(now)
    expect(board.items.map((i) => i.slug)).toEqual(['bby-41', 'bby-43', 'bby-44', 'bby-45'])
    expect(board.items[0]).toMatchObject({ hook: 'WHO DECIDES YOUR DAY?', status: 'draft' })
    expect(board.cost).toBeCloseTo(0.94)
  })

  test('approving inside the lead time sends it; later slots wait; sent rows lock', async () => {
    const { saveRayScript } = await import('@/libs/ray/run')
    const { rayComing, rayDueToday } = await import('@/libs/ray/plan')
    const { submitGeneration } = await import('@/libs/higgsfield')
    const sent = await saveRayScript({ slug: 'bby-41', hook: 'h', script: 'Say this.', approve: true }, now)
    expect(sent).toMatchObject({ status: 'generating', requestId: 'req-1', costUsd: 0.94, results: [] })
    expect(submitGeneration.mock.calls[0][1]).toMatchObject({ duration: 8, resolution: '480p', aspect_ratio: '9:16' })

    const later = await saveRayScript({ slug: 'bby-45', hook: '', script: 'Later.', approve: true }, now)
    expect(later.status).toBe('approved')
    expect(await rayComing('bby-41')).toBe(true)
    expect(await rayComing('bby-45')).toBe(false)
    expect(await rayDueToday(new Date('2026-11-25T14:00:00Z'))).toBe(true)
    await expect(saveRayScript({ slug: 'bby-41', script: 'x', approve: true }, now)).rejects.toThrow(/Already sent/)
  })

  test('the weekly cap holds videos back', async () => {
    const { saveRay } = await import('@/libs/ray/store')
    await saveRay('old', { status: 'posted', costUsd: 4.5, submittedAt: new Date('2026-11-22T00:00:00Z') })
    const { saveRayScript } = await import('@/libs/ray/run')
    const held = await saveRayScript({ slug: 'bby-41', script: 'Say this.', approve: true }, now)
    expect(held.status).toBe('approved')
    expect(held.error).toMatch(/cap/)
  })
})
