/**
 * @jest-environment node
 */
import { analyticsEvents, resolveRange } from '@/config/analytics'
import { barWidths, dayKey, dayKeys, rangeStart, summarize } from '@/libs/analytics'
import {
  channelFromMedium,
  hostOf,
  isLoopbackHost,
  matchReferrer,
  resolveAttribution,
} from '@/libs/analytics-channel'
import { deviceFrom, isBot, visitorId } from '@/libs/analytics-request'
import { trackEventSchema, validateSchema } from '@/libs/validation-schemas'

const SITE = 'https://bebetteryou.online'

describe('hostOf', () => {
  it('strips scheme, www and path', () => {
    expect(hostOf('https://www.Pinterest.com/pin/123')).toBe('pinterest.com')
  })

  it('accepts a bare hostname', () => {
    expect(hostOf('t.co')).toBe('t.co')
  })

  it('returns empty for junk and blanks', () => {
    expect(hostOf('')).toBe('')
    expect(hostOf(null)).toBe('')
    expect(hostOf('   ')).toBe('')
  })
})

describe('isLoopbackHost', () => {
  it('flags localhost, loopback IPs, and the .localhost TLD', () => {
    expect(isLoopbackHost('localhost')).toBe(true)
    expect(isLoopbackHost('http://localhost:3000/quotes')).toBe(true)
    expect(isLoopbackHost('app.localhost')).toBe(true)
    expect(isLoopbackHost('127.0.0.1:3000')).toBe(true)
    expect(isLoopbackHost('[::1]')).toBe(true)
  })

  it('lets real site hosts through', () => {
    expect(isLoopbackHost(SITE)).toBe(false)
    expect(isLoopbackHost('bebetteryou.online')).toBe(false)
    expect(isLoopbackHost('')).toBe(false)
  })
})

describe('matchReferrer', () => {
  it('files search engines under search, across country domains', () => {
    expect(matchReferrer('google.co.uk')).toMatchObject({ channel: 'search', source: 'Google' })
    expect(matchReferrer('duckduckgo.com')).toMatchObject({ channel: 'search' })
  })

  it('files known social hosts under social', () => {
    expect(matchReferrer('t.co')).toMatchObject({ channel: 'social', source: 'X' })
    expect(matchReferrer('pinterest.ca')).toMatchObject({ channel: 'social', source: 'Pinterest' })
    expect(matchReferrer('bsky.app')).toMatchObject({ channel: 'social', source: 'Bluesky' })
  })

  it('files AI assistants ahead of search, even on a google domain', () => {
    expect(matchReferrer('gemini.google.com')).toMatchObject({ channel: 'ai', source: 'Gemini' })
  })

  it('returns null for an unknown host', () => {
    expect(matchReferrer('someblog.dev')).toBeNull()
  })
})

describe('channelFromMedium', () => {
  it('maps paid and email mediums', () => {
    expect(channelFromMedium('cpc')).toBe('paid')
    expect(channelFromMedium('Newsletter')).toBe('email')
  })

  it('ignores anything it does not know', () => {
    expect(channelFromMedium('carrier-pigeon')).toBe('')
    expect(channelFromMedium('')).toBe('')
  })
})

describe('resolveAttribution', () => {
  it('treats a bare visit as direct', () => {
    expect(resolveAttribution({ siteHost: SITE })).toMatchObject({ channel: 'direct', source: '' })
  })

  it('credits the referrer when there are no utm tags', () => {
    expect(resolveAttribution({ referrer: 'https://pinterest.com/pin/9', siteHost: SITE })).toMatchObject({
      channel: 'social',
      source: 'Pinterest',
    })
  })

  it('falls back to referral for an unrecognised host', () => {
    expect(resolveAttribution({ referrer: 'https://someblog.dev/post', siteHost: SITE })).toMatchObject({
      channel: 'referral',
      source: 'someblog.dev',
    })
  })

  it('lets utm tags override the referrer', () => {
    expect(
      resolveAttribution({
        referrer: 'https://google.com',
        source: 'spring-mailer',
        medium: 'email',
        campaign: 'spring',
        siteHost: SITE,
      })
    ).toMatchObject({ channel: 'email', source: 'spring-mailer', campaign: 'spring' })
  })

  it('reads internal navigation as direct, not a self-referral', () => {
    expect(
      resolveAttribution({ referrer: 'https://bebetteryou.online/quotes', siteHost: SITE })
    ).toMatchObject({ channel: 'direct', source: '', referrer: '' })
  })

  it('treats www and bare as the same site', () => {
    expect(
      resolveAttribution({ referrer: 'https://www.bebetteryou.online/quotes', siteHost: SITE })
    ).toMatchObject({ channel: 'direct' })
  })

  it('accepts a list of own hosts, so the browsed host counts as internal', () => {
    expect(
      resolveAttribution({
        referrer: 'http://localhost:3000/quotes',
        siteHost: ['localhost:3000', SITE],
      })
    ).toMatchObject({ channel: 'direct', source: '' })
  })

  it('ignores blanks in that list rather than treating them as a host', () => {
    expect(
      resolveAttribution({ referrer: 'https://someblog.dev', siteHost: [null, '', SITE] })
    ).toMatchObject({ channel: 'referral', source: 'someblog.dev' })
  })
})

describe('date helpers', () => {
  it('buckets by UTC day', () => {
    expect(dayKey('2026-03-04T23:59:00.000Z')).toBe('2026-03-04')
  })

  it('returns empty for an unparseable date', () => {
    expect(dayKey('not a date')).toBe('')
  })

  it('makes a range that includes today', () => {
    const now = Date.parse('2026-03-10T12:00:00.000Z')
    const keys = dayKeys(7, now)
    expect(keys).toHaveLength(7)
    expect(keys[0]).toBe('2026-03-04')
    expect(keys[6]).toBe('2026-03-10')
    expect(rangeStart(7, now).toISOString()).toBe('2026-03-04T00:00:00.000Z')
  })
})

const NOW = Date.parse('2026-03-10T12:00:00.000Z')

function event(overrides = {}) {
  return {
    name: analyticsEvents.pageview,
    path: '/quotes',
    slug: '',
    target: '',
    channel: 'direct',
    source: '',
    visitor: 'v1',
    createdAt: '2026-03-10T09:00:00.000Z',
    ...overrides,
  }
}

describe('summarize', () => {
  const events = [
    event({ visitor: 'v1', path: '/', channel: 'social', source: 'Pinterest' }),
    event({ visitor: 'v1', path: '/quotes/bby1', channel: 'social', source: 'Pinterest' }),
    event({
      name: analyticsEvents.download,
      visitor: 'v1',
      slug: 'bby1',
      channel: 'social',
      source: 'Pinterest',
    }),
    event({ visitor: 'v2', path: '/', channel: 'search', source: 'Google' }),
    event({
      name: analyticsEvents.share,
      visitor: 'v2',
      slug: 'bby1',
      target: 'x',
      channel: 'search',
      source: 'Google',
    }),
    event({ visitor: 'v3', path: '/', channel: 'search', source: 'Google', createdAt: '2026-03-09T09:00:00.000Z' }),
  ]

  const data = summarize(events, { days: 7, now: NOW })

  it('counts distinct visitors rather than events', () => {
    expect(data.totals.visitors).toBe(3)
    expect(data.totals.pageviews).toBe(4)
    expect(data.totals.downloads).toBe(1)
    expect(data.totals.shares).toBe(1)
  })

  it('expresses downloads per hundred visits', () => {
    expect(data.totals.downloadRate).toBe(33.3)
  })

  it('ranks channels by visitors and carries their conversions', () => {
    expect(data.channels[0]).toMatchObject({ key: 'search', label: 'Organic search', visitors: 2 })
    expect(data.channels[1]).toMatchObject({ key: 'social', visitors: 1, downloads: 1 })
  })

  it('counts only pageviews towards top pages', () => {
    expect(data.pages[0]).toMatchObject({ key: '/', pageviews: 3 })
    expect(data.pages.some((row) => row.key === '')).toBe(false)
  })

  it('ranks downloaded quotes and labels share destinations', () => {
    expect(data.quotes[0]).toMatchObject({ key: 'bby1', downloads: 1 })
    expect(data.shareTargets[0]).toMatchObject({ key: 'x', label: 'X', shares: 1 })
  })

  it('fills every day in the range, including quiet ones', () => {
    expect(data.daily).toHaveLength(7)
    expect(data.daily[0]).toMatchObject({ key: '2026-03-04', visitors: 0 })
    expect(data.daily.at(-1)).toMatchObject({ key: '2026-03-10', visitors: 2 })
  })

  it('drops events older than the range', () => {
    const stale = summarize([...events, event({ visitor: 'old', createdAt: '2026-01-01T00:00:00.000Z' })], {
      days: 7,
      now: NOW,
    })
    expect(stale.totals.visitors).toBe(3)
  })

  it('survives an empty dataset', () => {
    const empty = summarize([], { days: 30, now: NOW })
    expect(empty.totals.visitors).toBe(0)
    expect(empty.totals.downloadRate).toBe(0)
    expect(empty.daily).toHaveLength(30)
    expect(empty.channels).toEqual([])
  })
})

describe('barWidths', () => {
  it('scales against the busiest row and keeps small rows visible', () => {
    const rows = [{ visitors: 10 }, { visitors: 5 }, { visitors: 1 }]
    expect(barWidths(rows, 'visitors')).toEqual([100, 50, 10])
  })

  it('returns zeroes when nothing has been recorded', () => {
    expect(barWidths([{ visitors: 0 }], 'visitors')).toEqual([0])
  })
})

describe('request fingerprinting', () => {
  it('flags crawlers and blank agents', () => {
    expect(isBot('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true)
    expect(isBot('')).toBe(true)
    expect(isBot('curl/8.4.0')).toBe(true)
  })

  it('lets a real browser through', () => {
    const chrome =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
    expect(isBot(chrome)).toBe(false)
    expect(deviceFrom(chrome)).toBe('desktop')
  })

  it('reads device class off the agent', () => {
    expect(deviceFrom('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('mobile')
    expect(deviceFrom('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('tablet')
  })
})

describe('visitorId', () => {
  const args = { ip: '203.0.113.5', userAgent: 'Chrome', now: NOW }

  it('is stable within a day', () => {
    expect(visitorId(args)).toBe(visitorId(args))
  })

  it('rotates the next day, so nobody is tracked across days', () => {
    const tomorrow = visitorId({ ...args, now: NOW + 24 * 60 * 60 * 1000 })
    expect(tomorrow).not.toBe(visitorId(args))
  })

  it('separates different visitors', () => {
    expect(visitorId({ ...args, ip: '198.51.100.7' })).not.toBe(visitorId(args))
  })

  it('stores no raw address', () => {
    expect(visitorId(args)).not.toContain('203.0.113.5')
    expect(visitorId(args)).toMatch(/^[a-f0-9]{32}$/)
  })
})

describe('trackEventSchema', () => {
  it('accepts a bare pageview and fills defaults', () => {
    const result = validateSchema(trackEventSchema, { name: 'pageview' })
    expect(result.success).toBe(true)
    expect(result.data).toMatchObject({ path: '/', slug: '', campaign: '' })
  })

  it('rejects an event name it does not know', () => {
    expect(validateSchema(trackEventSchema, { name: 'buy_now' }).success).toBe(false)
  })

  it('rejects an over-long path rather than truncating it', () => {
    expect(validateSchema(trackEventSchema, { name: 'pageview', path: 'x'.repeat(400) }).success).toBe(
      false
    )
  })
})

describe('resolveRange', () => {
  it('falls back to the default for junk', () => {
    expect(resolveRange('all-time').id).toBe('30d')
    expect(resolveRange(undefined).days).toBe(30)
  })

  it('resolves a known range', () => {
    expect(resolveRange('7d')).toMatchObject({ days: 7, label: '7 days' })
  })
})
