/**
 * @jest-environment node
 */

jest.mock('@/libs/integrations/store', () => ({
  getIntegration: jest.fn(async () => null),
}))
jest.mock('@/libs/social/youtube-store', () => ({
  resolveYoutubeRefreshToken: jest.fn(async () => ''),
  probeYoutubeRefreshToken: jest.fn(async () => false),
}))
jest.mock('@/libs/social/youtube-oauth', () => ({
  youtubeClient: () => ({ clientId: '', clientSecret: '' }),
}))
jest.mock('@/libs/ses', () => ({
  sesConfigured: () => false,
}))

import { fieldsToPatch, resolvePinterestKeys, resolveTelegramKeys } from '@/libs/integrations/credentials'
import { listIntegrationStatus } from '@/libs/integrations/status'
import { getIntegration } from '@/libs/integrations/store'

describe('integrations credentials', () => {
  beforeEach(() => {
    getIntegration.mockReset()
    getIntegration.mockResolvedValue(null)
  })

  it('maps telegram form fields to store patch', () => {
    expect(fieldsToPatch('telegram', { accessToken: 'bot', chatId: '-1001' })).toEqual({
      extras: { chatId: '-1001' },
      accessToken: 'bot',
    })
  })

  it('maps pinterest board id without wiping token', () => {
    expect(fieldsToPatch('pinterest', { boardId: '999' })).toEqual({
      extras: { boardId: '999' },
    })
  })

  it('prefers stored pinterest token over env', async () => {
    const prev = process.env.PINTEREST_ACCESS_TOKEN
    process.env.PINTEREST_ACCESS_TOKEN = 'env-token'
    process.env.PINTEREST_BOARD_ID = 'env-board'
    getIntegration.mockResolvedValueOnce({
      accessToken: 'stored-token',
      extras: { boardId: 'stored-board' },
    })
    await expect(resolvePinterestKeys()).resolves.toEqual({
      token: 'stored-token',
      boardId: 'stored-board',
      refreshToken: '',
    })
    if (prev === undefined) delete process.env.PINTEREST_ACCESS_TOKEN
    else process.env.PINTEREST_ACCESS_TOKEN = prev
  })

  it('falls back to env for telegram', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 't'
    process.env.TELEGRAM_CHAT_ID = 'c'
    await expect(resolveTelegramKeys()).resolves.toEqual({ token: 't', chatId: 'c' })
  })
})

describe('listIntegrationStatus', () => {
  beforeEach(() => {
    getIntegration.mockReset()
    getIntegration.mockResolvedValue(null)
  })

  it('marks pinterest connectable when app credentials exist', async () => {
    const prevId = process.env.PINTEREST_APP_ID
    const prevSecret = process.env.PINTEREST_APP_SECRET
    process.env.PINTEREST_APP_ID = 'app'
    process.env.PINTEREST_APP_SECRET = 'secret'
    delete process.env.PINTEREST_ACCESS_TOKEN
    delete process.env.PINTEREST_BOARD_ID
    delete process.env.PINTEREST_SANDBOX

    const { social, email } = await listIntegrationStatus()
    const pin = social.find((n) => n.id === 'pinterest')
    expect(pin).toMatchObject({
      ready: false,
      connectable: true,
      connectHref: '/api/social/pinterest/connect',
    })
    expect(email.find((e) => e.id === 'resend')).toBeTruthy()
    expect(email.find((e) => e.id === 'ses')).toBeTruthy()

    if (prevId === undefined) delete process.env.PINTEREST_APP_ID
    else process.env.PINTEREST_APP_ID = prevId
    if (prevSecret === undefined) delete process.env.PINTEREST_APP_SECRET
    else process.env.PINTEREST_APP_SECRET = prevSecret
  })
})
