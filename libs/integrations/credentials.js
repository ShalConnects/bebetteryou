import { getIntegration } from '@/libs/integrations/store'

/** Prefer Mongo/local Integrations store, then env. */

export async function resolveInstagramKeys() {
  const stored = await getIntegration('instagram')
  return {
    token: stored?.accessToken || process.env.META_ACCESS_TOKEN || '',
    igUserId: stored?.extras?.igUserId || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '',
  }
}

export async function resolveFacebookKeys() {
  const stored = await getIntegration('facebook')
  return {
    token: stored?.accessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '',
    pageId: stored?.extras?.pageId || process.env.FACEBOOK_PAGE_ID || '',
  }
}

export async function resolveThreadsKeys() {
  const stored = await getIntegration('threads')
  return {
    token: stored?.accessToken || process.env.THREADS_ACCESS_TOKEN || '',
    userId: stored?.extras?.userId || process.env.THREADS_USER_ID || '',
  }
}

export async function resolveLinkedInKeys() {
  const stored = await getIntegration('linkedin')
  return {
    token: stored?.accessToken || process.env.LINKEDIN_ACCESS_TOKEN || '',
    orgId: stored?.extras?.orgId || process.env.LINKEDIN_ORG_ID || '',
    memberId: stored?.extras?.memberId || process.env.LINKEDIN_MEMBER_ID || '',
  }
}

export async function resolveXKeys() {
  const stored = await getIntegration('x')
  return {
    consumerKey: stored?.extras?.apiKey || process.env.X_API_KEY || '',
    consumerSecret: stored?.extras?.apiSecret || process.env.X_API_SECRET || '',
    token: stored?.accessToken || process.env.X_ACCESS_TOKEN || '',
    tokenSecret: stored?.extras?.accessSecret || process.env.X_ACCESS_SECRET || '',
  }
}

/**
 * Prefer Mongo OAuth tokens; refresh when the access token is dead.
 * Board id may come from Integrations extras or env.
 * Returns an empty token when auth is dead so callers fail clearly (not a cryptic API 401).
 */
export async function resolvePinterestKeys() {
  const stored = await getIntegration('pinterest')
  let token = stored?.accessToken || process.env.PINTEREST_ACCESS_TOKEN || ''
  let refreshToken = stored?.refreshToken || process.env.PINTEREST_REFRESH_TOKEN || ''
  const boardId = stored?.extras?.boardId || process.env.PINTEREST_BOARD_ID || ''

  const { probePinterestAccessToken, refreshPinterestAccessToken } = await import(
    '@/libs/social/pinterest-oauth'
  )
  if (token && (await probePinterestAccessToken(token))) {
    return { token, boardId, refreshToken }
  }

  if (refreshToken) {
    const refreshed = await refreshPinterestAccessToken(refreshToken)
    if (refreshed?.access_token) {
      token = refreshed.access_token
      if (refreshed.refresh_token) refreshToken = refreshed.refresh_token
      try {
        const { saveIntegration } = await import('@/libs/integrations/store')
        await saveIntegration('pinterest', {
          accessToken: token,
          refreshToken,
          lastError: '',
          lastOkAt: new Date(),
        })
      } catch {
        /* posting can still use the in-memory token */
      }
      return { token, boardId, refreshToken }
    }
  }

  return { token: '', boardId, refreshToken }
}

export async function resolveBlueskyKeys() {
  const stored = await getIntegration('bluesky')
  return {
    handle: stored?.extras?.handle || process.env.BLUESKY_HANDLE || '',
    password: stored?.extras?.password || process.env.BLUESKY_APP_PASSWORD || '',
    pds: (stored?.extras?.pds || process.env.BLUESKY_PDS || 'https://bsky.social').replace(/\/$/, ''),
  }
}

export async function resolveTelegramKeys() {
  const stored = await getIntegration('telegram')
  return {
    token: stored?.accessToken || process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: stored?.extras?.chatId || process.env.TELEGRAM_CHAT_ID || '',
  }
}

/**
 * Map Integrations form fields → store patch.
 * @param {string} network
 * @param {Record<string, string>} fields
 */
export function fieldsToPatch(network, fields = {}) {
  const f = Object.fromEntries(
    Object.entries(fields || {}).map(([k, v]) => [k, String(v ?? '').trim()])
  )
  const extras = {}
  let accessToken
  let refreshToken

  if (network === 'instagram') {
    if (f.accessToken) accessToken = f.accessToken
    if (f.igUserId) extras.igUserId = f.igUserId
  } else if (network === 'facebook') {
    if (f.accessToken) accessToken = f.accessToken
    if (f.pageId) extras.pageId = f.pageId
  } else if (network === 'threads') {
    if (f.accessToken) accessToken = f.accessToken
    if (f.userId) extras.userId = f.userId
  } else if (network === 'linkedin') {
    if (f.accessToken) accessToken = f.accessToken
    if (f.orgId) extras.orgId = f.orgId
    if (f.memberId) extras.memberId = f.memberId
  } else if (network === 'x') {
    if (f.accessToken) accessToken = f.accessToken
    if (f.apiKey) extras.apiKey = f.apiKey
    if (f.apiSecret) extras.apiSecret = f.apiSecret
    if (f.accessSecret) extras.accessSecret = f.accessSecret
  } else if (network === 'pinterest') {
    if (f.accessToken) accessToken = f.accessToken
    if (f.refreshToken) refreshToken = f.refreshToken
    if (f.boardId) extras.boardId = f.boardId
  } else if (network === 'bluesky') {
    if (f.handle) extras.handle = f.handle
    if (f.password) extras.password = f.password
    if (f.pds) extras.pds = f.pds
  } else if (network === 'telegram') {
    if (f.accessToken) accessToken = f.accessToken
    if (f.chatId) extras.chatId = f.chatId
  } else {
    throw new Error(`Unknown network: ${network}`)
  }

  const patch = { extras }
  if (accessToken !== undefined) patch.accessToken = accessToken
  if (refreshToken !== undefined) patch.refreshToken = refreshToken
  return patch
}
