/**
 * @jest-environment node
 */
import { normalizeQuery, scoreFields, tokenize } from '@/libs/search'
import { searchHref } from '@/libs/search-url'

describe('tokenize / normalizeQuery', () => {
  it('trims, lowercases, and strips punctuation', () => {
    expect(tokenize('  Discipline! #Growth  ')).toEqual(['discipline', 'growth'])
  })

  it('caps query length', () => {
    expect(normalizeQuery('a'.repeat(200))).toHaveLength(100)
  })
})

describe('scoreFields', () => {
  const fields = [
    { text: 'Atomic Habits', weight: 5 },
    { text: 'James Clear', weight: 4 },
    { text: 'tiny changes', weight: 2 },
  ]

  it('requires every token', () => {
    expect(scoreFields(fields, ['atomic', 'missing'])).toBe(0)
  })

  it('scores title hits higher than body', () => {
    expect(scoreFields(fields, ['atomic'])).toBeGreaterThan(scoreFields(fields, ['tiny']))
  })

  it('boosts word-start matches', () => {
    const start = scoreFields([{ text: 'clear thinking', weight: 1 }], ['clear'])
    const mid = scoreFields([{ text: 'unclear thinking', weight: 1 }], ['clear'])
    expect(start).toBeGreaterThan(mid)
  })
})

describe('searchHref', () => {
  it('builds query strings', () => {
    expect(searchHref({ q: 'grit' })).toBe('/search?q=grit')
    expect(searchHref({ q: 'grit', page: 2 })).toBe('/search?q=grit&page=2')
    expect(searchHref()).toBe('/search')
  })
})

describe('searchSite', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.doMock('@/libs/content', () => ({
      listQuotes: jest.fn(async () => [
        {
          slug: 'bby-1',
          n: 1,
          text: 'Be yourself every day.',
          author: '',
          tags: ['Yourself'],
        },
      ]),
    }))
    jest.doMock('@/libs/blog', () => ({
      listPosts: jest.fn(() => [
        {
          slug: 'discipline-for-men',
          title: 'Discipline Quotes for Men',
          excerpt: 'Showing up unimpressed.',
          description: 'Advice on discipline.',
          tag: 'Yourself',
          topic: 'discipline',
        },
      ]),
    }))
    jest.doMock('@/libs/books', () => ({
      listBooks: jest.fn(() => [
        {
          slug: 'atomic-habits',
          title: 'Atomic Habits',
          author: 'James Clear',
          blurb: 'Tiny changes',
          description: 'Systems over goals',
          tags: ['Growth'],
          asin: '0735211299',
        },
      ]),
    }))
    jest.doMock('@/config/app', () => ({
      appConfig: { features: { enableBlog: true, enableBooks: true } },
    }))
  })

  it('returns empty for short queries', async () => {
    const { searchSite } = await import('@/libs/search')
    expect(await searchSite('a')).toMatchObject({ total: 0, groups: [] })
  })

  it('finds books, posts, and quotes by keyword', async () => {
    const { searchSite } = await import('@/libs/search')
    const books = await searchSite('atomic')
    expect(books.groups).toEqual([
      expect.objectContaining({
        type: 'books',
        items: [expect.objectContaining({ title: 'Atomic Habits', external: true })],
      }),
    ])

    const posts = await searchSite('discipline')
    expect(posts.groups[0].type).toBe('posts')
    expect(posts.groups[0].items[0].href).toBe('/blog/discipline-for-men')

    const quotes = await searchSite('yourself')
    expect(quotes.groups.some((g) => g.type === 'quotes')).toBe(true)
    expect(quotes.groups.find((g) => g.type === 'quotes').items[0].href).toBe('/quotes/bby-1')
  })

  it('respects per-group limit but reports uncapped total', async () => {
    jest.doMock('@/libs/content', () => ({
      listQuotes: jest.fn(async () => [
        { slug: 'a', n: 1, text: 'the path ahead', tags: [] },
        { slug: 'b', n: 2, text: 'the quiet dawn', tags: [] },
        { slug: 'c', n: 3, text: 'the long road', tags: [] },
      ]),
    }))
    jest.doMock('@/libs/blog', () => ({ listPosts: jest.fn(() => []) }))
    jest.doMock('@/libs/books', () => ({ listBooks: jest.fn(() => []) }))
    const { searchSite } = await import('@/libs/search')
    const preview = await searchSite('the', { limit: 2 })
    expect(preview.groups[0].items).toHaveLength(2)
    expect(preview.total).toBe(3)
  })
})
