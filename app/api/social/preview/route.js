import { NextResponse } from 'next/server'
import { requireAdmin } from '@/libs/auth-helpers'
import { previewQuoteShort } from '@/libs/social'

/** Encode can exceed the default serverless window. */
export const maxDuration = 60

export async function GET(req) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  const slug = new URL(req.url).searchParams.get('slug')?.trim()
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  try {
    const { video } = await previewQuoteShort(slug)
    return new NextResponse(new Uint8Array(video), {
      headers: { 'Content-Type': 'video/mp4', 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 400 })
  }
}
