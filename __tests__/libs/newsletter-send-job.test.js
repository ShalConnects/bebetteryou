/**
 * @jest-environment node
 */
import {
  activeAudienceFilter,
  mergeSlugs,
  quoteContentKey,
  utcDayKey,
} from '@/libs/newsletter-send-job'

describe('newsletter send job', () => {
  it('builds a stable quote key', () => {
    expect(quoteContentKey(['bby-2', 'bby-1', 'bby-2'])).toBe('quote:bby-1,bby-2')
  })

  it('merges same-day slugs without duplicates', () => {
    expect(mergeSlugs(['bby-1'], ['bby-2', 'bby-1', '  '])).toEqual(['bby-1', 'bby-2'])
  })

  it('uses the UTC day', () => {
    expect(utcDayKey(new Date('2026-10-24T02:00:00.000Z'))).toBe('2026-10-24')
  })

  it('mails every active subscriber for the pref', () => {
    const filter = activeAudienceFilter('quotes')
    expect(filter['prefs.quotes']).toBe(true)
    expect(filter.source).toBe('newsletter')
    expect(JSON.stringify(filter)).not.toMatch(/lastQuoteEmailedAt/)
  })
})
