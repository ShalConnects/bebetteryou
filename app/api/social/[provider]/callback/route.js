import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireAdmin } from '@/libs/auth-helpers'
import { saveIntegration } from '@/libs/integrations/store'
import { refreshNetworkStatus } from '@/libs/social/status-cache'
import {
  exchangePinterestCode,
  pinterestApp,
  pinterestOauthCookie,
  pinterestPublicOrigin,
} from '@/libs/social/pinterest-oauth'
import {
  exchangeYoutubeCode,
  requestOrigin,
  youtubeClient,
  youtubeOauthCookie,
} from '@/libs/social/youtube-oauth'
import { saveYoutubeRefreshToken } from '@/libs/social/youtube-store'
import { xAuthFinish, xAuthStart, xOauthCookie } from '@/libs/social/x-oauth'

/** YouTube + Pinterest + X OAuth return — same public paths as before (`/api/social/youtube|pinterest|x/callback`). */
export async function GET(req, { params }) {
  const { provider } = await params
  if (provider === 'youtube') return youtubeCallback(req)
  if (provider === 'pinterest') return pinterestCallback(req)
  if (provider === 'x') return xCallback(req)
  return NextResponse.json({ error: 'Unknown provider' }, { status: 404 })
}

async function youtubeCallback(req) {
  const origin = requestOrigin(req)
  const dashboard = `${origin}/dashboard/integrations`
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) {
    return NextResponse.redirect(`${dashboard}?youtube=signin`)
  }

  const url = new URL(req.url)
  const err = url.searchParams.get('error')
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const jar = await cookies()
  let saved = {}
  try {
    saved = JSON.parse(jar.get(youtubeOauthCookie)?.value || '{}')
  } catch {
    saved = {}
  }
  jar.delete(youtubeOauthCookie)

  if (err) return NextResponse.redirect(`${dashboard}?youtube=${encodeURIComponent(err)}`)
  if (!code || !state || state !== saved.state || !saved.redirectUri) {
    return NextResponse.redirect(`${dashboard}?youtube=state`)
  }

  try {
    const { clientId, clientSecret } = youtubeClient()
    const tokens = await exchangeYoutubeCode({
      code,
      redirectUri: saved.redirectUri,
      clientId,
      clientSecret,
    })
    await saveYoutubeRefreshToken(tokens.refresh_token)
    refreshNetworkStatus()
    return NextResponse.redirect(`${dashboard}?youtube=connected`)
  } catch {
    return NextResponse.redirect(`${dashboard}?youtube=token`)
  }
}

async function pinterestCallback(req) {
  const origin = pinterestPublicOrigin(req)
  const dashboard = `${origin}/dashboard/integrations`
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) {
    return NextResponse.redirect(`${dashboard}?pinterest=signin`)
  }

  const url = new URL(req.url)
  const err = url.searchParams.get('error')
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const jar = await cookies()
  let saved = {}
  try {
    saved = JSON.parse(jar.get(pinterestOauthCookie)?.value || '{}')
  } catch {
    saved = {}
  }
  jar.delete(pinterestOauthCookie)

  if (err) return NextResponse.redirect(`${dashboard}?pinterest=${encodeURIComponent(err)}`)
  if (!code || !state || state !== saved.state || !saved.redirectUri) {
    return NextResponse.redirect(`${dashboard}?pinterest=state`)
  }

  try {
    const { appId, appSecret } = pinterestApp()
    const tokens = await exchangePinterestCode({
      code,
      redirectUri: saved.redirectUri,
      appId,
      appSecret,
    })
    await saveIntegration('pinterest', {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      lastError: '',
      lastOkAt: new Date(),
    })
    refreshNetworkStatus()
    return NextResponse.redirect(`${dashboard}?pinterest=connected`)
  } catch {
    return NextResponse.redirect(`${dashboard}?pinterest=token`)
  }
}

/** X: opened bare it starts the sign-in (no extra Vercel function); X then returns here with the verifier. */
async function xCallback(req) {
  const origin = pinterestPublicOrigin(req)
  const dashboard = `${origin}/dashboard/integrations`
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return NextResponse.redirect(`${dashboard}?x=signin`)

  const url = new URL(req.url)
  const token = url.searchParams.get('oauth_token')
  const verifier = url.searchParams.get('oauth_verifier')
  const jar = await cookies()

  if (url.searchParams.get('denied')) {
    jar.delete(xOauthCookie)
    return NextResponse.redirect(`${dashboard}?x=denied`)
  }
  try {
    if (!token || !verifier) {
      const start = await xAuthStart(`${origin}/api/social/x/callback`)
      jar.set(xOauthCookie, JSON.stringify({ token: start.token, secret: start.secret }), {
        httpOnly: true,
        sameSite: 'lax',
        secure: origin.startsWith('https'),
        path: '/',
        maxAge: 600,
      })
      return NextResponse.redirect(start.url)
    }
    let saved = {}
    try {
      saved = JSON.parse(jar.get(xOauthCookie)?.value || '{}')
    } catch {
      saved = {}
    }
    jar.delete(xOauthCookie)
    if (saved.token !== token) return NextResponse.redirect(`${dashboard}?x=state`)
    const { accessToken, accessSecret, username } = await xAuthFinish({ token, secret: saved.secret, verifier })
    await saveIntegration('x', { accessToken, extras: { accessSecret, username }, lastError: '', lastOkAt: new Date() })
    refreshNetworkStatus()
    return NextResponse.redirect(`${dashboard}?x=connected`)
  } catch (err) {
    return NextResponse.redirect(`${dashboard}?x=${encodeURIComponent(err.message || 'error')}`)
  }
}
