import { cleanQuoteLine, parseBulkQuotes } from '@/libs/quote-text'

test('cleans a pasted line and moves the credit into the author', () => {
  expect(cleanQuoteLine('12\tsometimes it is.never mind')).toEqual({ text: 'Sometimes it is. Never mind', author: '' })
  expect(cleanQuoteLine('"Trust your gut." By Doe Zantamata')).toEqual({ text: 'Trust your gut.', author: 'Doe Zantamata' })
  expect(cleanQuoteLine('Hello world. — Andre Brink')).toEqual({ text: 'Hello world.', author: 'Andre Brink' })
  expect(cleanQuoteLine('Be perfect... just try..').text).toBe('Be perfect... just try.')
  expect(cleanQuoteLine('Be yourself - world will adjust').author).toBe('')
})

test('flags quotes already on the site and repeats in the paste', () => {
  const rows = parseBulkQuotes('Stay kind.\n\nNew one!\nstay  kind', [{ n: 7, text: 'Stay kind!' }])
  expect(rows.map((r) => [r.text, r.onSite, r.repeat])).toEqual([
    ['Stay kind.', 7, false],
    ['New one!', null, false],
    ['Stay kind', 7, true],
  ])
})
