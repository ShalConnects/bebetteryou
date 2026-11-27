/**
 * @jest-environment node
 */
import fs from 'fs'
import os from 'os'
import path from 'path'

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/libs/ai', () => ({ askJson: jest.fn() }))
jest.mock('@/libs/quote-card.mjs', () => ({ renderQuoteCard: jest.fn(async () => Buffer.from('jpg')) }))
jest.mock('@/libs/quote-assets', () => ({ saveQuoteImage: jest.fn(async (f) => `/quotes/${f}`) }))
jest.mock('@/libs/tags-store', () => ({
  readTags: jest.fn(async () => [{ name: 'Yourself', theme: 'self-worth' }]),
  tagNames: (rows) => rows.map((r) => r.name),
}))
jest.mock('@/libs/social', () => ({ postCard: jest.fn(async () => [{ id: 'facebook', ok: true }]) }))
jest.mock('@/libs/social/providers/telegram', () => ({ postTelegram: jest.fn(async () => ({})) }))
jest.mock('@/libs/trends/sources', () => ({
  sourceOrder: jest.requireActual('@/libs/trends/sources').sourceOrder,
  readers: {
    google: jest.fn(async () => [{ topic: 'Big game', context: '' }]),
    x: jest.fn(async () => []),
    bluesky: jest.fn(async () => [{ topic: 'Thanksgiving Day celebrations', context: 'holiday wishes' }]),
  },
}))

describe('Trend cards', () => {
  const home = process.cwd()
  let dir
  afterEach(() => process.chdir(home))
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bby-trend-'))
    fs.mkdirSync(path.join(dir, 'data'))
    process.chdir(dir)
    delete process.env.MONGODB_URI
    delete process.env.VERCEL
  })

  test('sources take turns by date and the rest follow as fallbacks', () => {
    const { sourceOrder } = jest.requireActual('@/libs/trends/sources')
    const days = ['2026-11-28', '2026-11-29', '2026-11-30'].map((d) => sourceOrder(d)[0])
    expect(new Set(days).size).toBe(3)
    expect(sourceOrder('2026-11-28')).toHaveLength(3)
  })

  test('a source with nothing safe falls back; Fridays are skipped; one draft a day', async () => {
    const { askJson } = await import('@/libs/ai')
    askJson.mockImplementation(async ({ prompt }) =>
      prompt.includes('Thanksgiving')
        ? { pick: 1, topic: 'Thanksgiving', hashtag: 'Thanks giving!', text: 'Count what stayed.', tag: 'Yourself' }
        : { pick: null }
    )
    const { draftTrend } = await import('@/libs/trends/run')
    expect((await draftTrend(new Date('2026-11-27T14:00:00Z'))).reason).toBe('friday')
    const row = await draftTrend(new Date('2026-11-28T14:00:00Z'))
    expect(row).toMatchObject({ source: 'bluesky', topic: 'Thanksgiving', hashtag: 'Thanksgiving', theme: 'self-worth', status: 'draft' })
    expect((await draftTrend(new Date('2026-11-28T14:05:00Z'))).reason).toBe('already drafted')
    const { postTelegram } = await import('@/libs/social/providers/telegram')
    expect(postTelegram).toHaveBeenCalledWith(expect.objectContaining({ alert: true }))
  })

  test('only an approved card posts at 11 pm; late approval posts at once', async () => {
    const { saveTrend } = await import('@/libs/trends/store')
    await saveTrend('2026-11-28', { source: 'x', topic: 'First snow', hashtag: 'FirstSnow', text: 'Start small.', tags: ['Yourself'], src: '/a.jpg' })
    const { postTrend, updateTrend } = await import('@/libs/trends/run')
    const { postCard } = await import('@/libs/social')
    expect(await postTrend(new Date('2026-11-28T17:00:00Z'))).toEqual({ skipped: true })
    const late = await updateTrend({ date: '2026-11-28', action: 'approve' }, new Date('2026-11-28T17:30:00Z'))
    expect(late.status).toBe('posted')
    expect(postCard).toHaveBeenCalledWith(expect.objectContaining({ slug: 'trend-2026-11-28', trend: { topic: 'First snow', hashtag: 'FirstSnow' } }))
    await expect(updateTrend({ date: '2026-11-28', action: 'skip' })).rejects.toThrow(/Already posted/)
  })
})
