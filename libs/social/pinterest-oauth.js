export const pinterestOauthCookie = 'bby_pin_oauth'

export const pinterestScopes = 'boards:read,boards:write,pins:read,pins:write,user_accounts:read'

export function pinterestApp() {
  return {
    appId: String(process.env.PINTEREST_APP_ID || '').trim(),
    appSecret: String(process.env.PINTEREST_APP_SECRET || '').trim(),
  }
}

export function requestOrigin(req) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000'
  const proto =
    req.headers.get('x-forwarded-proto') || (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https')
  return `${proto}://${host}`
}

/** Prefer SITE_URL so redirect matches the registered Pinterest URI (www vs apex). */
export function pinterestPublicOrigin(req) {
  const site = String(process.env.SITE_URL || process.env.NEXTAUTH_URL || '').trim().replace(/\/$/, '')
  if (site.startsWith('http://') || site.startsWith('https://')) return site
  return requestOrigin(req)
}

export function pinterestRedirectUri(origin) {
  return `${String(origin).replace(/\/$/, '')}/api/social/pinterest/callback`
}

export function pinterestAuthUrl({ appId, redirectUri, state }) {
  const url = new URL('https://www.pinterest.com/oauth/')
  url.searchParams.set('client_id', appId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', pinterestScopes)
  url.searchParams.set('state', state)
  return url.toString()
}

export async function exchangePinterestCode({ code, redirectUri, appId, appSecret }) {
  const basic = Buffer.from(`${appId}:${appSecret}`).toString('base64')
  const res = await fetch('https://api.pinterest.com/v5/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.access_token) {
    throw new Error(data.message || data.error || `Token exchange failed (${res.status})`)
  }
  return data
}

export function pinterestApiBase() {
  const sandbox = process.env.PINTEREST_SANDBOX
  return sandbox === '1' || sandbox === 'true'
    ? 'https://api-sandbox.pinterest.com'
    : 'https://api.pinterest.com'
}

const PROBE_TTL_MS = 5 * 60 * 1000
let lastProbe = { key: '', ok: false, at: 0 }

/** Lightweight /user_account probe (cached ~5m). False on missing/revoked tokens. */
export async function probePinterestAccessToken(accessToken) {
  const token = String(accessToken || '').trim()
  if (!token) return false
  if (lastProbe.key === token && Date.now() - lastProbe.at < PROBE_TTL_MS) return lastProbe.ok

  let ok = false
  try {
    const res = await fetch(`${pinterestApiBase()}/v5/user_account`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    ok = res.ok
  } catch {
    ok = false
  }
  lastProbe = { key: token, ok, at: Date.now() }
  return ok
}

export async function refreshPinterestAccessToken(refreshToken) {
  const token = String(refreshToken || '').trim()
  const { appId, appSecret } = pinterestApp()
  if (!token || !appId || !appSecret) return null

  const basic = Buffer.from(`${appId}:${appSecret}`).toString('base64')
  const res = await fetch('https://api.pinterest.com/v5/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: token,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.access_token) return null
  return data
}
