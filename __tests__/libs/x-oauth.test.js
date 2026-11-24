/**
 * @jest-environment node
 */
import crypto from 'crypto'
import { oauth1Header } from '@/libs/social/oauth'

describe('oauth1Header', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1318622958 * 1000)
    jest.spyOn(crypto, 'randomBytes').mockReturnValue({ toString: () => 'kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg' })
  })
  afterEach(() => jest.restoreAllMocks())

  test("matches X's documented signature example", () => {
    const header = oauth1Header(
      'POST',
      'https://api.twitter.com/1.1/statuses/update.json',
      { include_entities: 'true', status: 'Hello Ladies + Gentlemen, a signed OAuth request!' },
      {
        consumerKey: 'xvz1evFS4wEEPTGEFPHBog',
        consumerSecret: 'kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw',
        token: '370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb',
        tokenSecret: 'LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE',
      }
    )
    expect(header).toContain('oauth_signature="hCtSmYh%2BiHYCEqBWrE7C7hYmtUk%3D"')
    expect(header).not.toContain('status=')
  })

  test('sign-in: callback goes in the header, no token', () => {
    const header = oauth1Header('POST', 'https://api.x.com/oauth/request_token', { oauth_callback: 'https://a.b/cb' }, {
      consumerKey: 'k',
      consumerSecret: 's',
    })
    expect(header).toContain('oauth_callback="https%3A%2F%2Fa.b%2Fcb"')
    expect(header).not.toContain('oauth_token=')
  })
})
