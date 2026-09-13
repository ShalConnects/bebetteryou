import { mergePriceEntry } from '@/libs/book-prices'

describe('mergePriceEntry', () => {
  it('stores a fresh price', () => {
    expect(mergePriceEntry(null, { amount: 14, display: '$14.00', currency: 'USD' }, 1)).toEqual({
      amount: 14,
      currency: 'USD',
      display: '$14.00',
      at: 1,
      prevDisplay: '',
      changed: false,
    })
  })

  it('keeps the prior display when the amount changes', () => {
    const prev = { amount: 12, display: '$12.00', currency: 'USD', at: 1, prevDisplay: '', changed: false }
    const next = mergePriceEntry(prev, { amount: 15, display: '$15.00', currency: 'USD' }, 2)
    expect(next.display).toBe('$15.00')
    expect(next.prevDisplay).toBe('$12.00')
    expect(next.changed).toBe(true)
  })
})
