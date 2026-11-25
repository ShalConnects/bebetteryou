import { filterQuotes } from '@/config/dashboard'

test('Cards filter by status: draft, scheduled, or live (anything else)', () => {
  const quotes = [{ n: 1, status: 'draft' }, { n: 2, status: 'scheduled' }, { n: 3, status: 'published' }, { n: 4 }]
  const ns = (status) => filterQuotes(quotes, { status }).map((q) => q.n)
  expect(ns('draft')).toEqual([1])
  expect(ns('scheduled')).toEqual([2])
  expect(ns('posted')).toEqual([3, 4])
  expect(ns('')).toEqual([1, 2, 3, 4])
})
