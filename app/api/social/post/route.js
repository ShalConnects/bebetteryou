import { NextResponse } from 'next/server'
import { requireAdmin } from '@/libs/auth-helpers'
import { postQuote, readyNetworks } from '@/libs/social'
import { readPosts } from '@/libs/social/post-store'

/** Encode + YouTube upload can exceed the default serverless window. */
export const maxDuration = 60

export async function GET(req) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  const slug = new URL(req.url).searchParams.get('slug')?.trim()
  const [networks, posts] = await Promise.all([
    readyNetworks(),
    slug ? readPosts(slug) : Promise.resolve({}),
  ])
  return NextResponse.json({ networks, posts })
}

export async function POST(req) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  const slug = body?.slug?.trim()
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  try {
    const results = await postQuote(slug, body?.networks)
    return NextResponse.json({ results })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 400 })
  }
}
