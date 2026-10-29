import { postNetworks } from '@/config/social'
import { getIntegration } from '@/libs/integrations/store'
import { youtubeClient } from '@/libs/social/youtube-oauth'
import { probeYoutubeRefreshToken, resolveYoutubeRefreshToken } from '@/libs/social/youtube-store'

function envOn(key) {
  return Boolean(String(process.env[key] || '').trim())
}

/** Env-only — avoid importing @aws-sdk via libs/ses in social/ready paths. */
function sesConfigured() {
  return envOn('SES_ACCESS_KEY_ID') && envOn('SES_SECRET_ACCESS_KEY')
}

function envTruthy(key) {
  const s = process.env[key]
  return s === '1' || s === 'true'
}

async function pinterestReady() {
  const stored = await getIntegration('pinterest')
  const boardId = stored?.extras?.boardId || process.env.PINTEREST_BOARD_ID
  const pending = envTruthy('PINTEREST_SANDBOX')
  const appReady = envOn('PINTEREST_APP_ID') && envOn('PINTEREST_APP_SECRET')
  const { resolvePinterestKeys } = await import('@/libs/integrations/credentials')
  const { probePinterestAccessToken } = await import('@/libs/social/pinterest-oauth')
  const { token } = await resolvePinterestKeys()
  const tokenOk = Boolean(token) && (await probePinterestAccessToken(token))
  const hasStoredOauth = Boolean(stored?.accessToken || stored?.refreshToken)

  if (pending) {
    return {
      ready: false,
      pending: true,
      connectable: appReady,
      reconnect: false,
      detail: 'Sandbox mode on',
    }
  }
  if (!boardId) {
    return {
      ready: false,
      pending: false,
      connectable: appReady,
      reconnect: hasStoredOauth || Boolean(token),
      detail: 'Board id missing — save it below',
    }
  }
  if (!tokenOk) {
    return {
      ready: false,
      pending: false,
      connectable: appReady,
      reconnect: appReady && (hasStoredOauth || Boolean(token) || envOn('PINTEREST_ACCESS_TOKEN')),
      detail: appReady
        ? 'Token expired or missing — use Connect Pinterest'
        : 'Not connected (set PINTEREST_APP_ID / SECRET)',
    }
  }
  return {
    ready: true,
    pending: false,
    connectable: appReady,
    reconnect: appReady,
    detail: hasStoredOauth ? '' : 'Using env token — Connect to store a refreshable one',
  }
}

async function youtubeReady() {
  const { clientId, clientSecret } = youtubeClient()
  const configured = Boolean(clientId && clientSecret)
  const token = configured ? await resolveYoutubeRefreshToken() : ''
  const ok = configured && token && (await probeYoutubeRefreshToken(token))
  return {
    ready: Boolean(ok),
    pending: false,
    connectable: configured,
    reconnect: configured && Boolean(token) && !ok,
    detail: !configured ? 'Client id/secret missing' : ok ? '' : token ? 'Token expired' : 'Not connected',
  }
}

async function rowFromStored(network, { accessEnv, extraChecks }) {
  const stored = await getIntegration(network)
  const access = stored?.accessToken || (accessEnv ? process.env[accessEnv] : '')
  const extrasOk = extraChecks(stored)
  return {
    ready: Boolean(access && extrasOk.ok),
    pending: false,
    connectable: false,
    reconnect: false,
    detail: extrasOk.detail || (access ? '' : 'Not configured'),
    hasStored: Boolean(stored?.accessToken || stored?.refreshToken),
  }
}

/** Full Integrations dashboard status (social + email). */
export async function listIntegrationStatus() {
  const social = []

  for (const net of postNetworks) {
    let row = {
      id: net.id,
      label: net.label,
      kind: 'social',
      ready: false,
      pending: false,
      connectable: false,
      reconnect: false,
      detail: '',
      fields: [],
      connectHref: null,
    }

    if (net.id === 'youtube') {
      Object.assign(row, await youtubeReady())
      row.connectHref = '/api/social/youtube/connect'
      row.fields = []
    } else if (net.id === 'pinterest') {
      Object.assign(row, await pinterestReady())
      row.connectHref = '/api/social/pinterest/connect'
      row.fields = [
        { key: 'boardId', label: 'Board ID', secret: false, env: 'PINTEREST_BOARD_ID' },
      ]
    } else if (net.id === 'instagram') {
      Object.assign(
        row,
        await rowFromStored('instagram', {
          accessEnv: 'META_ACCESS_TOKEN',
          extraChecks: (stored) => {
            const id = stored?.extras?.igUserId || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
            return { ok: Boolean(id), detail: id ? '' : 'Instagram business account id missing' }
          },
        })
      )
      row.fields = [
        { key: 'accessToken', label: 'Meta access token', secret: true, env: 'META_ACCESS_TOKEN' },
        { key: 'igUserId', label: 'IG business account id', secret: false, env: 'INSTAGRAM_BUSINESS_ACCOUNT_ID' },
      ]
    } else if (net.id === 'facebook') {
      Object.assign(
        row,
        await rowFromStored('facebook', {
          accessEnv: 'FACEBOOK_PAGE_ACCESS_TOKEN',
          extraChecks: (stored) => {
            const id = stored?.extras?.pageId || process.env.FACEBOOK_PAGE_ID
            return { ok: Boolean(id), detail: id ? '' : 'Page id missing' }
          },
        })
      )
      row.fields = [
        { key: 'accessToken', label: 'Page access token', secret: true, env: 'FACEBOOK_PAGE_ACCESS_TOKEN' },
        { key: 'pageId', label: 'Page id', secret: false, env: 'FACEBOOK_PAGE_ID' },
      ]
    } else if (net.id === 'threads') {
      Object.assign(
        row,
        await rowFromStored('threads', {
          accessEnv: 'THREADS_ACCESS_TOKEN',
          extraChecks: (stored) => {
            const id = stored?.extras?.userId || process.env.THREADS_USER_ID
            return { ok: Boolean(id), detail: id ? '' : 'Threads user id missing' }
          },
        })
      )
      row.fields = [
        { key: 'accessToken', label: 'Threads access token', secret: true, env: 'THREADS_ACCESS_TOKEN' },
        { key: 'userId', label: 'Threads user id', secret: false, env: 'THREADS_USER_ID' },
      ]
    } else if (net.id === 'linkedin') {
      if (envTruthy('LINKEDIN_PENDING')) {
        row.pending = true
        row.detail = 'LinkedIn marked pending'
      } else {
        const stored = await getIntegration('linkedin')
        const token = stored?.accessToken || process.env.LINKEDIN_ACCESS_TOKEN
        const orgId = stored?.extras?.orgId || process.env.LINKEDIN_ORG_ID
        const memberId = stored?.extras?.memberId || process.env.LINKEDIN_MEMBER_ID
        row.ready = Boolean(token && (orgId || memberId))
        row.detail = token ? (orgId || memberId ? '' : 'Org or member id missing') : 'Not configured'
      }
      row.fields = [
        { key: 'accessToken', label: 'Access token', secret: true, env: 'LINKEDIN_ACCESS_TOKEN' },
        { key: 'orgId', label: 'Organization id', secret: false, env: 'LINKEDIN_ORG_ID' },
        { key: 'memberId', label: 'Member id', secret: false, env: 'LINKEDIN_MEMBER_ID' },
      ]
    } else if (net.id === 'x') {
      if (envTruthy('X_PENDING')) {
        row.pending = true
        row.detail = 'X marked pending'
      } else {
        const stored = await getIntegration('x')
        const keys = {
          apiKey: stored?.extras?.apiKey || process.env.X_API_KEY,
          apiSecret: stored?.extras?.apiSecret || process.env.X_API_SECRET,
          accessToken: stored?.accessToken || process.env.X_ACCESS_TOKEN,
          accessSecret: stored?.extras?.accessSecret || process.env.X_ACCESS_SECRET,
        }
        row.ready = Boolean(keys.apiKey && keys.apiSecret && keys.accessToken && keys.accessSecret)
        row.detail = row.ready ? '' : 'Not configured'
      }
      row.fields = [
        { key: 'apiKey', label: 'API key', secret: true, env: 'X_API_KEY' },
        { key: 'apiSecret', label: 'API secret', secret: true, env: 'X_API_SECRET' },
        { key: 'accessToken', label: 'Access token', secret: true, env: 'X_ACCESS_TOKEN' },
        { key: 'accessSecret', label: 'Access secret', secret: true, env: 'X_ACCESS_SECRET' },
      ]
    } else if (net.id === 'bluesky') {
      const stored = await getIntegration('bluesky')
      const handle = stored?.extras?.handle || process.env.BLUESKY_HANDLE
      const password = stored?.extras?.password || process.env.BLUESKY_APP_PASSWORD
      row.ready = Boolean(handle && password)
      row.detail = row.ready ? '' : 'Not configured'
      row.fields = [
        { key: 'handle', label: 'Handle', secret: false, env: 'BLUESKY_HANDLE' },
        { key: 'password', label: 'App password', secret: true, env: 'BLUESKY_APP_PASSWORD' },
      ]
    } else if (net.id === 'telegram') {
      const stored = await getIntegration('telegram')
      const token = stored?.accessToken || process.env.TELEGRAM_BOT_TOKEN
      const chatId = stored?.extras?.chatId || process.env.TELEGRAM_CHAT_ID
      row.ready = Boolean(token && chatId)
      row.detail = row.ready ? '' : 'Not configured'
      row.fields = [
        { key: 'accessToken', label: 'Bot token', secret: true, env: 'TELEGRAM_BOT_TOKEN' },
        { key: 'chatId', label: 'Chat / channel id', secret: false, env: 'TELEGRAM_CHAT_ID' },
      ]
    }

    const stored = await getIntegration(net.id)
    if (stored?.lastError) row.lastError = stored.lastError
    if (stored?.lastOkAt) row.lastOkAt = stored.lastOkAt

    social.push(row)
  }

  const email = [
    {
      id: 'resend',
      label: 'Resend',
      kind: 'email',
      ready: envOn('RESEND_API_KEY'),
      pending: false,
      connectable: false,
      detail: envOn('RESEND_API_KEY')
        ? envOn('RESEND_WEBHOOK_SECRET')
          ? 'Transactional + webhooks'
          : 'API key set (webhook secret missing)'
        : 'RESEND_API_KEY missing',
      fields: [],
    },
    {
      id: 'ses',
      label: 'Amazon SES',
      kind: 'email',
      ready: sesConfigured(),
      pending: false,
      connectable: false,
      detail: sesConfigured()
        ? `Region ${process.env.SES_REGION || 'us-east-1'}`
        : 'SES keys not set (quote blasts stay on Resend until configured)',
      fields: [],
    },
  ]

  return { social, email }
}
