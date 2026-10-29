import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireAdmin } from '@/libs/auth-helpers'
import { saveIntegration } from '@/libs/integrations/store'
import {
  exchangePinterestCode,
  pinterestApp,
  pinterestOauthCookie,
  requestOrigin,
} from '@/libs/social/pinterest-oauth'

export async function GET(req) {
  const origin = requestOrigin(req)
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
    return NextResponse.redirect(`${dashboard}?pinterest=connected`)
  } catch {
    return NextResponse.redirect(`${dashboard}?pinterest=token`)
  }
}
