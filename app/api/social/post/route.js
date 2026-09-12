import { NextResponse } from 'next/server'
import { requireAdmin } from '@/libs/auth-helpers'
import { postQuote, readyNetworks } from '@/libs/social'

/** Encode + YouTube upload can exceed the default serverless window. */
export const maxDuration = 60

export async function GET() {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  return NextResponse.json({ networks: await readyNetworks() })
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
