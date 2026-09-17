import { NextResponse } from 'next/server'
import { requireAdmin } from '@/libs/auth-helpers'
import { cancelSchedule, createSchedule, listSchedules } from '@/libs/social/schedule-store'
import { readyNetworks } from '@/libs/social'
import { readQuotes } from '@/libs/quotes-store'

export const maxDuration = 30

export async function GET(req) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  const slug = new URL(req.url).searchParams.get('slug')?.trim()
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })
  const schedules = await listSchedules(slug)
  return NextResponse.json({ schedules })
}

export async function POST(req) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  const slug = body?.slug?.trim()
  const runAt = body?.runAt
  const networks = Array.isArray(body?.networks) ? body.networks : []

  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const quote = (await readQuotes()).find((q) => q.slug === slug)
  if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })

  const status = await readyNetworks()
  const ready = new Set(status.filter((n) => n.ready).map((n) => n.id))
  const selected = [...new Set(networks.map(String))].filter((id) => ready.has(id))
  if (!selected.length) {
    return NextResponse.json({ error: 'Select at least one ready network' }, { status: 400 })
  }

  try {
    const schedule = await createSchedule({ slug, networks: selected, runAt })
    return NextResponse.json({ schedule }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to schedule' }, { status: 400 })
  }
}

export async function DELETE(req) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  const id = new URL(req.url).searchParams.get('id')?.trim()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  try {
    const schedule = await cancelSchedule(id)
    return NextResponse.json({ schedule })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to cancel' }, { status: 400 })
  }
}
