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
import { clipPinText, hasPinterestKeys, pinterestTitle } from '@/libs/social/providers/pinterest'
import { clipThreadsText, hasThreadsKeys } from '@/libs/social/providers/threads'
import { letterboxRect } from '@/libs/social/quote-short'
import { requestOrigin, youtubeRedirectUri } from '@/libs/social/youtube-oauth'

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
  }, 30_000)
})
