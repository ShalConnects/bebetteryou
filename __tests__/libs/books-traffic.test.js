/**
 * @jest-environment node
 */
import { analyticsEvents } from '@/config/analytics'
import { summarize } from '@/libs/analytics'
import { bookKey, pickBookForPin } from '@/libs/social/book-pin'
import { weekBookLine } from '@/libs/week-review'

jest.mock('@/libs/social', () => ({ readyNetworks: jest.fn() }))

const books = [{ slug: 'grit' }, { slug: 'deep-work' }, { slug: 'mindset' }]

test('book pins: never-pinned first, A–Z', () => {
  const posts = { [bookKey('deep-work')]: { pinterest: { ok: true, at: '2026-11-01T00:00:00Z' } } }
  expect(pickBookForPin(books, posts).slug).toBe('grit')
})

test('book pins: once all are up, the one pinned longest ago repeats', () => {
  const at = { grit: '2026-11-08', 'deep-work': '2026-11-01', mindset: '2026-11-15' }
  const posts = Object.fromEntries(books.map((b) => [bookKey(b.slug), { pinterest: { ok: true, at: at[b.slug] } }]))
  expect(pickBookForPin(books, posts).slug).toBe('deep-work')
})

test("week review caption names one book, stable for the week", () => {
  const quotes = [{ n: 1, tags: ['Mindset'] }, { n: 2, tags: ['Growth'] }]
  const line = weekBookLine(quotes, { weekKey: '2026-11-27' })
  expect(line).toMatch(/This week's read: .+ by .+ → .+\/books#[a-z-]+$/)
  expect(weekBookLine(quotes, { weekKey: '2026-11-27' })).toBe(line)
})

test('Insights counts Amazon clicks by book and by page', () => {
  const now = Date.parse('2026-11-24T12:00:00Z')
  const ev = (slug, path) => ({ name: analyticsEvents.bookClick, slug, path, visitor: 'v', createdAt: new Date(now) })
  const data = summarize([ev('grit', '/books'), ev('grit', '/quotes/bby-1'), ev('mindset', '/books')], { days: 7, now })
  expect(data.books[0]).toMatchObject({ key: 'grit', bookClicks: 2 })
  expect(data.bookPages[0]).toMatchObject({ key: '/books', bookClicks: 2 })
})
