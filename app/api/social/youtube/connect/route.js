import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { requireAdmin } from '@/libs/auth-helpers'
import {
  googleYoutubeAuthUrl,
  requestOrigin,
  youtubeClient,
  youtubeOauthCookie,
  youtubeRedirectUri,
} from '@/libs/social/youtube-oauth'

export async function GET(req) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { clientId, clientSecret } = youtubeClient()
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET (or GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)' },
      { status: 400 }
    )
  }

  const origin = requestOrigin(req)
  const redirectUri = youtubeRedirectUri(origin)
  const state = crypto.randomBytes(16).toString('hex')
  const jar = await cookies()
  jar.set(youtubeOauthCookie, JSON.stringify({ state, redirectUri }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: origin.startsWith('https'),
    path: '/',
    maxAge: 600,
  })

  return NextResponse.redirect(googleYoutubeAuthUrl({ clientId, redirectUri, state }))
}
