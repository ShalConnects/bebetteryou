/**
 * @jest-environment node
 */
import { pickMotif } from '@/libs/quote-motifs.mjs'

describe('quote motifs', () => {
  it('picks by catalog tag priority', () => {
    expect(pickMotif(['Love'], 1)).toBe('heart')
    expect(pickMotif(['Growth', 'Love'], 1)).toBe('sprout')
    expect(pickMotif(['Yourself', 'Motivation'], 1)).toBe('spark')
  })

  it('falls back stably from n when untagged', () => {
    expect(pickMotif([], 0)).toBe('spark')
    expect(pickMotif([], 5)).toBe('spark')
    expect(pickMotif([], 2)).toBe('sprout')
  })
})
