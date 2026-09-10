import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/libs/auth-helpers'
import { createTag, deleteTag, editTag, listTagsWithUsage } from '@/libs/manage-tag'
import { tagNames } from '@/libs/tags-store'
import { NextResponse } from 'next/server'

function revalidateTags() {
  for (const path of ['/', '/quotes', '/dashboard/quotes', '/dashboard/tags']) revalidatePath(path)
}

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
    await createTag(body?.name, body?.moodLabel)
    revalidateTags()
    const tags = await listTagsWithUsage()
    return NextResponse.json({ tags, names: tagNames(tags) }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 400 })
  }
}
