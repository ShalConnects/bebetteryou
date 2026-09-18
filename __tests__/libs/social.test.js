jest.mock('@/libs/quotes-store', () => ({
  readQuotes: jest.fn(async () => []),
}))
jest.mock('@/libs/tags-store', () => ({
  readTags: jest.fn(async () => []),
}))
jest.mock('@/libs/social/youtube-store', () => ({
  readYoutubeRefreshToken: jest.fn(async () => ''),
  saveYoutubeRefreshToken: jest.fn(),
}))

import { oauth1Header, hasXKeys } from '@/libs/social/oauth'
import { quoteCaption } from '@/libs/social'
import { hasYoutubeKeys, youtubeTitle } from '@/libs/social/providers/youtube'
import {
  clipPinText,
  hasPinterestKeys,
  pinterestApiBase,
  pinterestTitle,
} from '@/libs/social/providers/pinterest'
import { clipThreadsText, hasThreadsKeys } from '@/libs/social/providers/threads'
import { blueskyCaption, clipBlueskyText, hasBlueskyKeys, linkFacets } from '@/libs/social/providers/bluesky'
import { clipTelegramCaption, hasTelegramKeys } from '@/libs/social/providers/telegram'
import { letterboxRect, listShortBeds, pickShortBed, quotePhrases, shortBeats } from '@/libs/social/quote-short'
import { requestOrigin, youtubeRedirectUri } from '@/libs/social/youtube-oauth'
import { alreadyPosted, defaultSelected, mergePostRecord } from '@/libs/social/post-log'

describe('social', () => {
  it('builds quote caption with link', async () => {
    const caption = await quoteCaption({
      n: 1,
      slug: 'bby-1',
      text: 'Line one\nLine two',
      author: 'Author',
    })
    expect(caption).toContain('Line one Line two')
    expect(caption).toContain('— Author')
    expect(caption).toContain('/quotes/bby-1')
  })

  it('oauth1 header includes signature', () => {
    const keys = {
      consumerKey: 'ck',
      consumerSecret: 'cs',
      token: 'tk',
      tokenSecret: 'ts',
    }
    expect(hasXKeys(keys)).toBe(true)
    expect(oauth1Header('POST', 'https://api.twitter.com/2/tweets', {}, keys)).toMatch(
      /oauth_signature=/
    )
  })

  it('detects missing X keys', () => {
    expect(hasXKeys({ consumerKey: 'a', consumerSecret: '', token: 'c', tokenSecret: 'd' })).toBe(false)
  })

  it('detects missing YouTube keys', () => {
    expect(hasYoutubeKeys({ clientId: 'id', clientSecret: 'secret', refreshToken: '' })).toBe(false)
    expect(hasYoutubeKeys({ clientId: 'id', clientSecret: 'secret', refreshToken: 'rt' })).toBe(true)
  })

  it('detects missing Pinterest keys', () => {
    expect(hasPinterestKeys({ token: 't', boardId: '' })).toBe(false)
    expect(hasPinterestKeys({ token: 't', boardId: '123' })).toBe(true)
  })

  it('detects missing Threads keys', () => {
    expect(hasThreadsKeys({ token: 't', userId: '' })).toBe(false)
    expect(hasThreadsKeys({ token: 't', userId: '123' })).toBe(true)
  })

  it('clips Threads captions to 500 chars', () => {
    expect(clipThreadsText('Keep going.')).toBe('Keep going.')
    expect(clipThreadsText('x'.repeat(520)).length).toBe(500)
  })

  it('detects missing Bluesky keys', () => {
    expect(hasBlueskyKeys({ handle: 'a.bsky.social', password: '' })).toBe(false)
    expect(hasBlueskyKeys({ handle: 'a.bsky.social', password: 'xxxx-xxxx' })).toBe(true)
  })

  it('detects missing Telegram keys', () => {
    expect(hasTelegramKeys({ token: 't', chatId: '' })).toBe(false)
    expect(hasTelegramKeys({ token: 't', chatId: '@channel' })).toBe(true)
  })

  it('clips Telegram captions to 1024 chars', () => {
    expect(clipTelegramCaption('Keep going.')).toBe('Keep going.')
    expect(clipTelegramCaption('x'.repeat(1100)).length).toBe(1024)
  })

  it('keeps Bluesky captions under 300 graphemes with a clickable link', () => {
    const text = blueskyCaption(
      { n: 1, slug: 'bby-1', text: 'Keep going.', author: 'Author' },
      'https://www.bebetteryou.online'
    )
    expect(text).toContain('Keep going.')
    expect(text).toContain('https://www.bebetteryou.online/quotes/bby-1')
    expect([...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(text)].length).toBeLessThanOrEqual(
      300
    )
    expect(clipBlueskyText('x'.repeat(320)).length).toBe(300)
    expect(linkFacets(text)[0].features[0].uri).toBe('https://www.bebetteryou.online/quotes/bby-1')
  })

  it('uses sandbox API when PINTEREST_SANDBOX is set', () => {
    process.env.PINTEREST_SANDBOX = 'true'
    expect(pinterestApiBase()).toBe('https://api-sandbox.pinterest.com')
    delete process.env.PINTEREST_SANDBOX
    expect(pinterestApiBase()).toBe('https://api.pinterest.com')
  })

  it('clips Pinterest title to 100 chars', () => {
    expect(pinterestTitle({ n: 3, text: 'Keep going.' })).toBe('Keep going.')
    expect(clipPinText('x'.repeat(120), 100).length).toBe(100)
  })

  it('builds a Shorts title under 100 chars', () => {
    const short = youtubeTitle({ n: 3, text: 'Keep going.' })
    expect(short).toBe('Keep going. #Shorts')
    const long = 'x'.repeat(120)
    const clipped = youtubeTitle({ text: long })
    expect(clipped.endsWith('#Shorts')).toBe(true)
    expect(clipped.length).toBeLessThanOrEqual(100)
  })

  it('letterboxes the 600×750 card on a 9:16 Short', () => {
    const box = letterboxRect(600, 750, 1080, 1920)
    expect(box.w).toBe(1080)
    expect(box.h).toBe(1350)
    expect(box.x).toBe(0)
    expect(box.y).toBe(285)
  })

  it('splits Short beats from line breaks, clauses, then word groups', () => {
    expect(quotePhrases('Be yourself,\nWorld will\nADJUST.')).toEqual(['Be yourself,', 'World will', 'ADJUST.'])
    expect(quotePhrases('Be yourself, world will adjust.')).toEqual(['Be yourself,', 'world will adjust.'])
    expect(quotePhrases('Keep going.')).toEqual(['Keep', 'going.'])
    const beats = shortBeats('Be yourself,\nWorld will\nADJUST.')
    expect(beats).toHaveLength(3)
    expect(beats[0].text).toBe('Be yourself,\nWorld will\nADJUST.')
    expect(beats.map((b) => b.reveal)).toEqual([1, 2, 3])
    expect(beats[2].seconds).toBeGreaterThan(beats[0].seconds)
  })

  it('rotates Shorts beds from assets/shorts', () => {
    const beds = listShortBeds()
    expect(pickShortBed(() => 0)).toBe(beds[0] || '')
    if (!beds.length) return
    expect(beds.every((file) => file.endsWith('.mp3'))).toBe(true)
    expect(pickShortBed(() => 0.999)).toBe(beds[beds.length - 1])
  })

  it('builds the live-site YouTube callback URL from the request host', () => {
    const req = {
      headers: new Headers({
        'x-forwarded-host': 'www.bebetteryou.online',
        'x-forwarded-proto': 'https',
      }),
    }
    expect(youtubeRedirectUri(requestOrigin(req))).toBe(
      'https://www.bebetteryou.online/api/social/youtube/callback'
    )
  })

  it('encodes a vertical mp4 from a quote JPEG', async () => {
    const fs = require('fs')
    const { encodeQuoteShort } = require('@/libs/social/quote-short')
    const jpg = fs.readFileSync('public/quotes/bby1.jpg')
    const mp4 = await encodeQuoteShort(jpg)
    expect(mp4.slice(4, 8).toString()).toBe('ftyp')
    expect(mp4.length).toBeGreaterThan(10_000)
    expect(mp4.includes(Buffer.from('mp4a'))).toBe(true)
  }, 45_000)

  it('encodes a kinetic Short from quote text', async () => {
    const { encodeQuoteShort } = require('@/libs/social/quote-short')
    const mp4 = await encodeQuoteShort(null, {
      n: 8,
      text: 'Be yourself,\nWorld will\nADJUST.',
      author: '',
    })
    expect(mp4.slice(4, 8).toString()).toBe('ftyp')
    expect(mp4.length).toBeGreaterThan(10_000)
    expect(mp4.includes(Buffer.from('mp4a'))).toBe(true)
  }, 45_000)

  it('leaves already-posted networks unchecked', () => {
    const networks = [
      { id: 'instagram', ready: true },
      { id: 'bluesky', ready: true },
      { id: 'threads', ready: false },
    ]
    const posts = { instagram: { ok: true, url: 'https://instagram.com/p/1' } }
    expect(defaultSelected(networks, posts)).toEqual(['bluesky'])
    expect(alreadyPosted(['instagram', 'bluesky'], posts)).toEqual(['instagram'])
  })

  it('keeps the last success URL when a later post fails', () => {
    const prev = mergePostRecord(null, {
      slug: 'bby-1',
      id: 'bluesky',
      ok: true,
      url: 'https://bsky.app/profile/x/post/1',
    })
    const failed = mergePostRecord(prev, { slug: 'bby-1', id: 'bluesky', ok: false, error: 'timeout' })
    expect(failed.ok).toBe(false)
    expect(failed.error).toBe('timeout')
    expect(failed.url).toBe('https://bsky.app/profile/x/post/1')
  })
})
