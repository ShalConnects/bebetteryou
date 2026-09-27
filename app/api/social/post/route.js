import { NextResponse } from 'next/server'
import { requireAdmin } from '@/libs/auth-helpers'
import { postQuote, readyNetworks } from '@/libs/social'
import { manualPostResults } from '@/libs/social/post-log'
import { readPosts, recordPost } from '@/libs/social/post-store'
import { recordDoneSocialSend } from '@/libs/social/schedule-store'

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

  const networks = [...new Set((body?.networks || []).map(String).filter(Boolean))]
  if (!networks.length) return NextResponse.json({ error: 'networks required' }, { status: 400 })

  try {
    /** Admin posted outside the app (e.g. X while API credits are depleted). */
    if (body?.manual) {
      const statusList = await readyNetworks()
      const known = new Set(statusList.map((n) => n.id))
      const invalid = networks.filter((id) => !known.has(id))
      if (invalid.length) {
        return NextResponse.json({ error: `Unknown network: ${invalid.join(', ')}` }, { status: 400 })
      }
      const labels = Object.fromEntries(statusList.map((n) => [n.id, n.label]))
      const results = manualPostResults(slug, networks, labels)
      for (const row of results) await recordPost(slug, row)
      await recordDoneSocialSend({ slug, networks, results })
      return NextResponse.json({ results })
    }

    const results = await postQuote(slug, networks)
    if (results.some((r) => r.ok)) {
      await recordDoneSocialSend({
        slug,
        networks,
        results,
      })
    }
    return NextResponse.json({ results })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 400 })
  }
}
