import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/libs/auth-helpers'
import { deleteTag, editTag, listTagsWithUsage } from '@/libs/manage-tag'
import { tagNames } from '@/libs/tags-store'
import { NextResponse } from 'next/server'

function revalidateTags() {
  for (const path of ['/', '/quotes', '/dashboard/quotes', '/dashboard/tags']) revalidatePath(path)
}

export async function PATCH(req, { params }) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const name = decodeURIComponent((await params).name)
  const body = await req.json().catch(() => null)

  try {
    await editTag(name, { name: body?.name, moodLabel: body?.moodLabel })
    revalidateTags()
    const tags = await listTagsWithUsage()
    return NextResponse.json({ tags, names: tagNames(tags) })
  } catch (err) {
    const status = err.message === 'Tag not found' ? 404 : 400
    return NextResponse.json({ error: err.message || 'Failed' }, { status })
  }
}

export async function DELETE(_req, { params }) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const name = decodeURIComponent((await params).name)

  try {
    await deleteTag(name)
    revalidateTags()
    const tags = await listTagsWithUsage()
    return NextResponse.json({ tags, names: tagNames(tags) })
  } catch (err) {
    const status = err.message === 'Tag not found' ? 404 : 400
    return NextResponse.json({ error: err.message || 'Failed' }, { status })
  }
}
