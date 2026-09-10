import { oauth1Header, hasXKeys, xKeys } from '@/libs/social/oauth'
import { quoteCaption } from '@/libs/social'

describe('social', () => {
  it('builds quote caption with link', () => {
    const caption = quoteCaption({
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
})
