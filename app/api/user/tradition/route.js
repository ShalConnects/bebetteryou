import { NextResponse } from 'next/server'
import { connectDB } from '@/libs/mongo'
import User from '@/models/User'
import { requireAuth } from '@/libs/auth-helpers'
import { handleApiError } from '@/libs/api'
import { isDbUserId } from '@/libs/admin-user'
import { traditionIds, translationsFor } from '@/config/traditions'

function validTranslation(tradition, translation) {
  if (!translation) return true
  return translationsFor(tradition).some((t) => t.id === translation)
}

const defaults = { tradition: null, showPassages: true, translation: 'niv' }

export async function GET() {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const id = auth.session.user.id
    if (!isDbUserId(id)) return NextResponse.json(defaults)

    await connectDB()
    const user = await User.findById(id).select('traditionPreference showPassages translationPreference')
    return NextResponse.json({
      tradition: user?.traditionPreference || null,
      showPassages: user?.showPassages !== false,
      translation: user?.translationPreference || 'niv',
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const id = auth.session.user.id
    if (!isDbUserId(id)) return NextResponse.json(defaults)

    const body = await request.json()
    const patch = {}
    if ('tradition' in body) {
      const { tradition } = body
      if (tradition != null && !traditionIds.has(tradition)) {
        return NextResponse.json({ error: 'Invalid tradition' }, { status: 400 })
      }
      patch.traditionPreference = tradition ?? null
    }
    if ('showPassages' in body) patch.showPassages = Boolean(body.showPassages)
    if ('translation' in body) {
      const tradition = body.tradition ?? patch.traditionPreference
      if (!validTranslation(tradition || 'christianity', body.translation)) {
        return NextResponse.json({ error: 'Invalid translation' }, { status: 400 })
      }
      patch.translationPreference = body.translation || 'niv'
    }

    await connectDB()
    const user = await User.findByIdAndUpdate(id, { $set: patch }, { new: true }).select(
      'traditionPreference showPassages translationPreference'
    )
    return NextResponse.json({
      tradition: user?.traditionPreference || null,
      showPassages: user?.showPassages !== false,
      translation: user?.translationPreference || 'niv',
    })
  } catch (error) {
    return handleApiError(error)
  }
}
