/**
 * One-time Google OAuth for YouTube Shorts uploads.
 * Prints a URL, then a refresh token to paste into .env.local.
 *
 * Google Cloud: enable YouTube Data API v3, create an OAuth client
 * (Desktop or Web) with redirect URI http://127.0.0.1:8765/callback
 */
import fs from 'fs'
import http from 'http'
import path from 'path'

const root = process.cwd()
const port = 8765
const redirectUri = `http://127.0.0.1:${port}/callback`
const scopes = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
].join(' ')

function loadEnvLocal() {
  const file = path.join(root, '.env.local')
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const i = trimmed.indexOf('=')
    if (i < 1) continue
    const key = trimmed.slice(0, i).trim()
    let val = trimmed.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvLocal()

const clientId = process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
const clientSecret = process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET
if (!clientId || !clientSecret) {
  console.error(
    'Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in .env.local (or GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).'
  )
  process.exit(1)
}

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
authUrl.searchParams.set('client_id', clientId)
authUrl.searchParams.set('redirect_uri', redirectUri)
authUrl.searchParams.set('response_type', 'code')
authUrl.searchParams.set('scope', scopes)
authUrl.searchParams.set('access_type', 'offline')
authUrl.searchParams.set('prompt', 'consent')

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`)
  if (url.pathname !== '/callback') {
    res.writeHead(404)
    res.end()
    return
  }
  const err = url.searchParams.get('error')
  const code = url.searchParams.get('code')
  if (err || !code) {
    res.writeHead(400, { 'Content-Type': 'text/plain' })
    res.end(err || 'Missing code')
    server.close()
    process.exit(1)
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  const data = await tokenRes.json()
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  if (!data.refresh_token) {
    res.end('No refresh token. Revoke the app at https://myaccount.google.com/permissions and try again.')
    console.error(data.error_description || data.error || data)
    server.close()
    process.exit(1)
  }
  res.end('YouTube connected. You can close this tab and return to the terminal.')
  console.log('\nPaste these into .env.local:\n')
  console.log(`YOUTUBE_CLIENT_ID=${clientId}`)
  console.log('YOUTUBE_CLIENT_SECRET=<the secret already in .env.local>')
  console.log(`YOUTUBE_REFRESH_TOKEN=${data.refresh_token}`)
  console.log('\nRestart npm run dev, then Post to social → YouTube Shorts.\n')
  server.close()
  process.exit(0)
})

server.listen(port, '127.0.0.1', () => {
  console.log('Open this URL, pick the BeBetterYou YouTube Google account, and allow upload:\n')
  console.log(authUrl.toString())
  console.log(`\nWaiting on ${redirectUri}`)
})
