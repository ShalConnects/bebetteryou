import crypto from 'crypto'

/** RFC 3986 encode (OAuth 1.0a). */
function enc(v) {
  return encodeURIComponent(String(v)).replace(/[!'()*]/g, (c) =>
    `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  )
}

/** OAuth 1.0a Authorization header for X API. */
export function oauth1Header(method, url, params, { consumerKey, consumerSecret, token, tokenSecret }) {
  const oauth = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: token,
    oauth_version: '1.0',
  }
  const merged = { ...params, ...oauth }
  const paramString = Object.keys(merged)
    .sort()
    .map((k) => `${enc(k)}=${enc(merged[k])}`)
    .join('&')
  const base = [method.toUpperCase(), enc(url), enc(paramString)].join('&')
  const key = `${enc(consumerSecret)}&${enc(tokenSecret || '')}`
  oauth.oauth_signature = crypto.createHmac('sha1', key).update(base).digest('base64')

  const header =
    'OAuth ' +
    Object.keys(oauth)
      .sort()
      .map((k) => `${enc(k)}="${enc(oauth[k])}"`)
      .join(', ')
  return header
}

export function xKeys() {
  return {
    consumerKey: process.env.X_API_KEY,
    consumerSecret: process.env.X_API_SECRET,
    token: process.env.X_ACCESS_TOKEN,
    tokenSecret: process.env.X_ACCESS_SECRET,
  }
}

export function hasXKeys(keys = xKeys()) {
  return Boolean(keys.consumerKey && keys.consumerSecret && keys.token && keys.tokenSecret)
}
