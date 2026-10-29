/**
 * Get a Pinterest write token (pins:write).
 *
 * Setup (once):
 * 1. Pinterest app Redirect URIs → add exactly: http://localhost:8766/
 * 2. .env.local → PINTEREST_APP_ID=1611123 and PINTEREST_APP_SECRET=…
 *
 * Run:
 *   npm run pinterest:auth
 * Allow in the browser. Tokens print in the terminal.
 *
 * If the browser shows a URL with ?code= but the terminal did nothing:
 *   npm run pinterest:auth -- 'http://localhost:8766/?code=PASTE'
 */
import fs from 'fs'
import http from 'http'
import path from 'path'
import { exec } from 'child_process'

const root = process.cwd()
const scopes = 'boards:read,boards:write,pins:read,pins:write,user_accounts:read'
const redirectUri = 'http://localhost:8766/'
const listenPort = 8766

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

function openBrowser(url) {
  const cmd =
    process.platform === 'darwin'
      ? `open "${url}"`
      : process.platform === 'win32'
        ? `start "" "${url}"`
        : `xdg-open "${url}"`
  exec(cmd, () => {})
}

function codeFromArg(raw) {
  const s = String(raw || '').trim()
  if (!s) return ''
  if (s.includes('code=')) {
    try {
      return new URL(s).searchParams.get('code') || ''
    } catch {
      const m = s.match(/[?&]code=([^&]+)/)
      return m ? decodeURIComponent(m[1]) : ''
    }
  }
  return s
}

async function exchangeCode(appId, appSecret, code) {
  const basic = Buffer.from(`${appId}:${appSecret}`).toString('base64')
  const tokenRes = await fetch('https://api.pinterest.com/v5/oauth/token', {
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
  const data = await tokenRes.json().catch(() => ({}))
  if (!tokenRes.ok || !data.access_token) {
    throw new Error(data.message || data.error || `Token exchange failed (${tokenRes.status})`)
  }

  const check = await fetch('https://api.pinterest.com/v5/user_account', {
    headers: { Authorization: `Bearer ${data.access_token}` },
  })
  const account = await check.json().catch(() => ({}))
  if (!check.ok) {
    throw new Error(account.message || account.error || `Token check failed (${check.status})`)
  }

  console.log('\nSuccess. Paste into .env.local and Vercel, then redeploy:\n')
  console.log(`PINTEREST_ACCESS_TOKEN=${data.access_token}`)
  if (data.refresh_token) {
    console.log(`PINTEREST_REFRESH_TOKEN=${data.refresh_token}`)
  }
  console.log('PINTEREST_SANDBOX=false')
  console.log('\nConnected as:', account.username || account.business_name || 'ok')
  console.log('Scopes:', data.scope || scopes)
  console.log('\nNext: npm run pinterest:boards\n')
}

loadEnvLocal()

const appId = (process.env.PINTEREST_APP_ID || process.env.PINTEREST_CLIENT_ID || '').trim()
const appSecret = (
  process.env.PINTEREST_APP_SECRET ||
  process.env.PINTEREST_CLIENT_SECRET ||
  ''
).trim()

if (!appId || !appSecret) {
  console.error(`Add to .env.local first:

  PINTEREST_APP_ID=1611123
  PINTEREST_APP_SECRET=<from Pinterest API keys>

And in Pinterest Redirect URIs add exactly:

  ${redirectUri}
`)
  process.exit(1)
}

const pasted = codeFromArg(process.argv[2])
if (pasted) {
  try {
    await exchangeCode(appId, appSecret, pasted)
  } catch (error) {
    console.error(error.message || error)
    console.error('\nThat code may be expired. Run again with no argument and Allow once more:')
    console.error('  npm run pinterest:auth\n')
    process.exit(1)
  }
  process.exit(0)
}

const authUrl = new URL('https://www.pinterest.com/oauth/')
authUrl.searchParams.set('client_id', appId)
authUrl.searchParams.set('redirect_uri', redirectUri)
authUrl.searchParams.set('response_type', 'code')
authUrl.searchParams.set('scope', scopes)

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, redirectUri)
    console.log('Got redirect from browser…')
    const err = url.searchParams.get('error')
    const code = url.searchParams.get('code')
    if (err || !code) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(err || 'Missing code')
      console.error(err || 'Missing code')
      server.close()
      process.exit(1)
    }

    await exchangeCode(appId, appSecret, code)
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Pinterest connected. Close this tab and check the terminal.')
    server.close()
    process.exit(0)
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Failed. Check the terminal.')
    console.error(error.message || error)
    server.close()
    process.exit(1)
  }
})

server.on('error', (error) => {
  console.error(error.message || error)
  process.exit(1)
})

// Listen on all interfaces so localhost (IPv4/IPv6) both work on macOS.
server.listen(listenPort, () => {
  console.log(`Redirect URI must be exactly:\n  ${redirectUri}\n`)
  console.log('Opening browser — click Allow, then watch this terminal.\n')
  console.log(authUrl.toString())
  console.log(`\nWaiting… (do not Ctrl+C)`)
  console.log(`If the browser shows a ?code= URL but nothing prints here, run:`)
  console.log(`  npm run pinterest:auth -- 'PASTE_THE_FULL_BROWSER_URL'\n`)
  openBrowser(authUrl.toString())
})
