import { NextResponse } from 'next/server'
import { connectDB } from '@/libs/mongo'
import User from '@/models/User'
import { requireAuth } from '@/libs/auth-helpers'
import { handleApiError } from '@/libs/api'
import { isDbUserId } from '@/libs/admin-user'
import { PLAN_TEXT_MAX, mergePracticeState } from '@/libs/practice-store'

const empty = { saved: [], plans: [], completedDays: [], completions: [] }
const BODY_MAX = 50_000

export async function GET() {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const id = auth.session.user.id
    if (!isDbUserId(id)) return NextResponse.json({ synced: false, state: empty })

    await connectDB()
    const user = await User.findById(id).select('practiceState')
    return NextResponse.json({ synced: true, state: user?.practiceState || empty })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const id = auth.session.user.id
    if (!isDbUserId(id)) return NextResponse.json({ synced: false, state: empty })

    const raw = await request.text()
    if (raw.length > BODY_MAX) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }
    let body = null
    try {
      body = raw ? JSON.parse(raw) : null
    } catch {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    if (Array.isArray(body.plans)) {
      for (const plan of body.plans) {
        if (
          String(plan?.trigger || '').length > PLAN_TEXT_MAX ||
          String(plan?.action || '').length > PLAN_TEXT_MAX
        ) {
          return NextResponse.json({ error: 'Plan text too long' }, { status: 400 })
        }
      }
    }

    await connectDB()
    const user = await User.findById(id).select('practiceState')
    const merged = mergePracticeState(user?.practiceState || empty, body)
    await User.findByIdAndUpdate(id, { $set: { practiceState: merged } })
    return NextResponse.json({ synced: true, state: merged })
  } catch (error) {
    return handleApiError(error)
  }
}
