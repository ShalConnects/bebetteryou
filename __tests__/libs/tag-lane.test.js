import { hashtagsForTags, retargetName, retargetNames, tagFields, themesMap, themeSet } from '@/libs/tag-lane'

describe('tag-lane', () => {
  it('builds lean catalog rows', () => {
    expect(tagFields({ name: 'Growth', moodLabel: ' Level up ', theme: 'Self Worth', hashtags: ' #a  #b ' })).toEqual({
      name: 'Growth',
      moodLabel: 'Level up',
      theme: 'self-worth',
      hashtags: '#a #b',
    })
    expect(tagFields({ name: 'X' })).toEqual({ name: 'X' })
  })

  it('derives theme maps', () => {
    const tags = [
      { name: 'Motivation', theme: 'perseverance' },
      { name: 'Mindset', theme: 'clarity' },
    ]
    expect(themesMap(tags)).toEqual({ Motivation: 'perseverance', Mindset: 'clarity' })
    expect([...themeSet(tags)].sort()).toEqual(['clarity', 'perseverance'])
  })

  it('retargets catalog names', () => {
    expect(retargetNames('Motivation', 'Drive')(['Motivation', 'Growth', 'Motivation'])).toEqual(['Drive', 'Growth'])
    expect(retargetNames('Motivation', '')(['Motivation', 'Growth'])).toEqual(['Growth'])
    expect(retargetName('Motivation', '')('Mindset')).toBe('Mindset')
  })

  it('dedupes hashtags across quote tags', () => {
    const catalog = [
      { name: 'Motivation', hashtags: '#motivation #bebetteryou' },
      { name: 'Growth', hashtags: '#growth #bebetteryou' },
    ]
    expect(hashtagsForTags(['Motivation', 'Growth'], catalog)).toBe('#motivation #bebetteryou #growth')
  })
})
