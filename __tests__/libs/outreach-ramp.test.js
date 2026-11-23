/**
 * @jest-environment node
 */
jest.mock('@/libs/mongo', () => ({}))
jest.mock('@/models/ShalOutreach', () => ({}))

import { dailyCap } from '@/libs/shal-outreach/store'

describe('outreach daily cap', () => {
  it('ramps at 30 a day for a week after a pre-clean, then goes back to full', () => {
    expect(dailyCap()).toBe(100)
    expect(dailyCap(new Date(Date.now() - 2 * 864e5))).toBe(30)
    expect(dailyCap(new Date(Date.now() - 8 * 864e5))).toBe(100)
  })
})
