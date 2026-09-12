import { requireAdmin } from '@/libs/auth-helpers'
import { createTag, listTagsWithUsage, revalidateTags } from '@/libs/manage-tag'
import { tagNames } from '@/libs/tags-store'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  const tags = await listTagsWithUsage()
  return NextResponse.json({ tags, names: tagNames(tags) })
}

export async function POST(req) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  try {
    await createTag(body?.name, {
      moodLabel: body?.moodLabel,
      theme: body?.theme,
      hashtags: body?.hashtags,
    })
    revalidateTags()
    const tags = await listTagsWithUsage()
    return NextResponse.json({ tags, names: tagNames(tags) }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 400 })
  }
}
