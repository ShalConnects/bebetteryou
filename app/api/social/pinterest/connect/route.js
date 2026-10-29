import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { requireAdmin } from '@/libs/auth-helpers'
import {
  pinterestApp,
  pinterestAuthUrl,
  pinterestOauthCookie,
  pinterestRedirectUri,
  requestOrigin,
} from '@/libs/social/pinterest-oauth'

export async function GET(req) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { appId, appSecret } = pinterestApp()
  if (!appId || !appSecret) {
    return NextResponse.json(
      { error: 'Set PINTEREST_APP_ID and PINTEREST_APP_SECRET in env (Vercel / .env.local)' },
      { status: 400 }
    )
  }

  const origin = requestOrigin(req)
  const redirectUri = pinterestRedirectUri(origin)
  const state = crypto.randomBytes(16).toString('hex')
  const jar = await cookies()
  jar.set(pinterestOauthCookie, JSON.stringify({ state, redirectUri }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: origin.startsWith('https'),
    path: '/',
    maxAge: 600,
  })

  return NextResponse.redirect(pinterestAuthUrl({ appId, redirectUri, state }))
}
