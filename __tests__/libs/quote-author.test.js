/**
 * @jest-environment node
 */
import { authorFromSources, authorKey, findQuoteAuthor } from '@/libs/quote-author'

const wilde = 'Nowadays people know the price of everything and the value of nothing.'
const fear = 'The only thing we have to fear is fear itself.'
const wander = 'Not all those who wander are lost.'
const misquote = 'Be yourself; everyone else is already taken.'

describe('authorFromSources', () => {
  it('treats spaced and dotted initials as the same person', () => {
    expect(authorKey('J.R.R. Tolkien')).toBe(authorKey('J. R. R. Tolkien'))
  })

  it('fills the author when two pages name the same person', () => {
    const author = authorFromSources(wilde, [
      {
        title: 'October 16',
        snippet: 'Nowadays people know the price of everything and the value of nothing. ~ Oscar Wilde ~ in ~ The Picture of Dorian Gray ~',
      },
      {
        title: 'The Picture of Dorian Gray',
        snippet: 'Nowadays people know the price of everything and the value of nothing. Men marry because they are tired.',
      },
    ], {
      'The Picture of Dorian Gray': 'The Picture of Dorian Gray is a philosophical novel by Oscar Wilde, first published in 1890.',
    })
    expect(author).toBe('Oscar Wilde')
  })

  it('accepts J.R.R. Tolkien when the work page spells the initials with spaces', () => {
    const author = authorFromSources(wander, [
      {
        title: 'Travel',
        snippet: 'Not all those who wander are lost. J.R.R. Tolkien, The Fellowship of the Ring',
      },
      {
        title: 'The Fellowship of the Ring',
        snippet: 'Not all those who wander are lost; The old that is strong does not wither',
      },
    ], {
      'The Fellowship of the Ring': 'The Fellowship of the Ring (1954); first of three volumes in The Lord of the Rings books by J. R. R. Tolkien. It contains Book I.',
    })
    expect(author).toBe('J. R. R. Tolkien')
  })

  it('stays blank when pages name different people', () => {
    const author = authorFromSources(fear, [
      {
        title: 'Franklin D. Roosevelt',
        snippet: 'let me assert my firm belief that the only thing we have to fear is fear itself — nameless, unreasoning terror',
      },
      {
        title: 'E pluribus unum',
        snippet: 'The only thing we have to fear is fear itself! Hillary Clinton, 2016 Democratic National Convention',
      },
    ])
    expect(author).toBe('')
  })

  it('fills a single clear credit and stays blank for a misattributed or original line', () => {
    expect(authorFromSources(wilde, [
      { title: 'October 16', snippet: `${wilde} ~ Oscar Wilde ~` },
    ])).toBe('Oscar Wilde')

    expect(authorFromSources(misquote, [
      {
        title: 'Oscar Wilde',
        snippet: 'misattributed quotation entry at John Cooper on Oscar Wilde. Be Yourself. Everyone Else Is Already Taken. Anonymous',
      },
    ])).toBe('')

    expect(authorFromSources('The telescope found a comet above the quiet hill.', [])).toBe('')
    expect(authorFromSources('Be yourself.', [
      { title: 'Oscar Wilde', snippet: 'Be yourself. ~ Oscar Wilde ~' },
      { title: 'Quotes', snippet: 'Be yourself. ~ Oscar Wilde ~' },
    ])).toBe('')
  })
})

describe('findQuoteAuthor', () => {
  it('asks Wikiquote for the line and the work page, then keeps the agreed name', async () => {
    const fetchImpl = jest.fn(async (url) => {
      const parsed = new URL(url)
      if (parsed.searchParams.get('list') === 'search') {
        return {
          ok: true,
          json: async () => ({
            query: {
              search: [
                { title: 'October 16', snippet: `${wilde} ~ Oscar Wilde ~` },
                { title: 'The Picture of Dorian Gray', snippet: `${wilde} Men marry because they are tired.` },
              ],
            },
          }),
        }
      }
      expect(parsed.searchParams.get('titles')).toBe('The Picture of Dorian Gray')
      return {
        ok: true,
        json: async () => ({
          query: {
            pages: {
              1: {
                title: 'The Picture of Dorian Gray',
                extract: 'A philosophical novel by Oscar Wilde.',
              },
            },
          },
        }),
      }
    })

    await expect(findQuoteAuthor(wilde, fetchImpl)).resolves.toBe('Oscar Wilde')
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('returns a blank author when the lookup fails', async () => {
    const fetchImpl = jest.fn(async () => { throw new Error('offline') })
    await expect(findQuoteAuthor(wilde, fetchImpl)).resolves.toBe('')
  })
})
