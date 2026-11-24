import { oauth1Header } from './oauth'

/** "Connect X": OAuth 1.0a sign-in that gives the site a token for whichever account authorizes. */
export const xOauthCookie = 'bby_x_oauth'

export const xApp = () => ({
  consumerKey: String(process.env.X_API_KEY || '').trim(),
  consumerSecret: String(process.env.X_API_SECRET || '').trim(),
})

async function oauthPost(url, params, keys) {
  const res = await fetch(url, { method: 'POST', headers: { Authorization: oauth1Header('POST', url, params, keys) } })
  const text = await res.text()
  if (!res.ok) throw new Error(`X sign-in failed (${res.status}): ${text.slice(0, 200)}`)
  return Object.fromEntries(new URLSearchParams(text))
}

/** Step 1: a request token, then X's sign-in page (force_login lets you pick the BeBetterYou account). */
export async function xAuthStart(callbackUrl) {
  const r = await oauthPost('https://api.x.com/oauth/request_token', { oauth_callback: callbackUrl }, xApp())
  if (r.oauth_callback_confirmed !== 'true') throw new Error('X did not accept the callback URL')
  return {
    token: r.oauth_token,
    secret: r.oauth_token_secret,
    url: `https://api.x.com/oauth/authorize?oauth_token=${encodeURIComponent(r.oauth_token)}&force_login=true`,
  }
}

/** Step 2: trade the verifier for the account's access token + secret. */
export async function xAuthFinish({ token, secret, verifier }) {
  const r = await oauthPost('https://api.x.com/oauth/access_token', { oauth_verifier: verifier }, {
    ...xApp(),
    token,
    tokenSecret: secret,
  })
  if (!r.oauth_token || !r.oauth_token_secret) throw new Error('X returned no access token')
  return { accessToken: r.oauth_token, accessSecret: r.oauth_token_secret, username: r.screen_name || '' }
}
