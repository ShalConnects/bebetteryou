/**
 * @jest-environment node
 */
import { hybridPick } from '@/libs/hybrid-pick'
import { normalizeRelated, tagsForPost } from '@/libs/related'

describe('hybridPick', () => {
  const pool = [
    { slug: 'a', tags: ['Motivation'] },
    { slug: 'b', tags: ['Mindset'] },
    { slug: 'c', tags: ['Motivation', 'Growth'] },
    { slug: 'd', tags: ['Love'] },
  ]

  it('returns pinned items first then soft tag matches', () => {
    const out = hybridPick({
      pool,
      pins: ['b'],
      tags: ['Motivation'],
      count: 3,
      seed: 1,
    })
    expect(out[0].slug).toBe('b')
    expect(out.slice(1).every((i) => i.tags.includes('Motivation'))).toBe(true)
    expect(out).toHaveLength(3)
  })

  it('ignores unknown pins and respects exclude', () => {
    const out = hybridPick({
      pool,
      pins: ['missing', 'a'],
      tags: ['Motivation'],
      exclude: 'c',
      count: 2,
      seed: 2,
    })
    expect(out.map((i) => i.slug)).toEqual(['a'])
  })

  it('returns empty when count is 0', () => {
    expect(hybridPick({ pool, tags: ['Motivation'], count: 0, seed: 1 })).toEqual([])
  })
})

describe('normalizeRelated', () => {
  it('dedupes slugs and clears empties', () => {
    expect(normalizeRelated({ books: [' atomic-habits ', 'atomic-habits', ''], posts: [] })).toEqual({
      books: ['atomic-habits'],
    })
    expect(normalizeRelated({})).toBeNull()
  })
})

describe('tagsForPost', () => {
  it('uses post.tag override', () => {
    expect(tagsForPost({ tag: 'Motivation', topic: 'discipline' })).toEqual(['Motivation'])
  })
})
