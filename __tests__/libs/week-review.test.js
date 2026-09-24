import { fridayWeekRange, pickFridayWeekQuotes } from '@/libs/week-review'

describe('week-review', () => {
  // Wednesday 23 Sep 2026 → upcoming Friday 25 Sep → Sat 19 → Thu 24
  const wed = new Date('2026-09-23T12:00:00.000Z')
  const fri = new Date('2026-09-25T12:00:00.000Z')

  it('anchors Sat–Thu on the upcoming (or current) Friday', () => {
    const fromWed = fridayWeekRange(wed)
    expect(fromWed.weekKey).toBe('2026-09-19')
    expect(fromWed.start.toISOString()).toBe('2026-09-19T00:00:00.000Z')
    expect(fromWed.end.toISOString()).toBe('2026-09-24T23:59:59.999Z')
    expect(fromWed.friday.toISOString().slice(0, 10)).toBe('2026-09-25')

    const fromFri = fridayWeekRange(fri)
    expect(fromFri.weekKey).toBe(fromWed.weekKey)
    expect(fromFri.friday.toISOString().slice(0, 10)).toBe('2026-09-25')
  })

  it('picks only dated cards in Sat–Thu and shuffles stably', () => {
    const range = fridayWeekRange(fri)
    const input = [
      { slug: 'a', n: 3, src: '/a.jpg', text: 'In', createdAt: '2026-09-20T10:00:00.000Z' },
      { slug: 'b', n: 2, src: '/b.jpg', text: 'Old', createdAt: '2026-09-01T10:00:00.000Z' },
      { slug: 'c', n: 1, src: '/c.jpg', text: 'Also in', createdAt: '2026-09-22T01:00:00.000Z' },
      { slug: 'd', n: 4, text: 'No src', createdAt: '2026-09-21T01:00:00.000Z' },
    ]
    const once = pickFridayWeekQuotes(input, range)
    const twice = pickFridayWeekQuotes(input, range)
    expect(once.mode).toBe('dated')
    expect(once.quotes.map((q) => q.slug).sort()).toEqual(['a', 'c'])
    expect(once.quotes.map((q) => q.slug)).toEqual(twice.quotes.map((q) => q.slug))
  })

  it('falls back to newest when dated window is empty', () => {
    const range = fridayWeekRange(fri)
    const { quotes, mode } = pickFridayWeekQuotes(
      [{ slug: 'a', n: 1, src: '/a.jpg', text: 'x', createdAt: '2026-09-01T00:00:00.000Z' }],
      range
    )
    expect(mode).toBe('recent')
    expect(quotes.map((q) => q.slug)).toEqual(['a'])
  })
})
