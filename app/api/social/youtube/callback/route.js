import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireAdmin } from '@/libs/auth-helpers'
import { exchangeYoutubeCode, requestOrigin, youtubeClient, youtubeOauthCookie } from '@/libs/social/youtube-oauth'
import { saveYoutubeRefreshToken } from '@/libs/social/youtube-store'

export async function GET(req) {
  const origin = requestOrigin(req)
  const dashboard = `${origin}/dashboard`
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
    return NextResponse.redirect(`${dashboard}?youtube=connected`)
  } catch (error) {
    return NextResponse.redirect(`${dashboard}?youtube=token`)
  }
}
