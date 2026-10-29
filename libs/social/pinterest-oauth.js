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
