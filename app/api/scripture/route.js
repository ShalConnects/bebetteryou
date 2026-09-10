import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/libs/auth-helpers'
import { listScriptureEntries, removeScripture, upsertScripture } from '@/libs/manage-scripture'
import { getScriptureBook } from '@/libs/scripture'
import { readTags } from '@/libs/tags-store'
import { themesMap } from '@/libs/tag-lane'
import { NextResponse } from 'next/server'

function revalidateScripture() {
  for (const path of ['/', '/quotes', '/dashboard/scripture']) revalidatePath(path)
}

export async function GET() {
  try {
    const [data, tags] = await Promise.all([getScriptureBook(), readTags()])
    return NextResponse.json({ data, themes: themesMap(tags) })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 })
  }
}
export async function POST(req) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  try {
    await upsertScripture(body || {})
    revalidateScripture()
    return NextResponse.json({ entries: await listScriptureEntries() }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 400 })
  }
}

export async function DELETE(req) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  try {
    await removeScripture(body?.tradition, body?.theme, body?.index)
    revalidateScripture()
    return NextResponse.json({ entries: await listScriptureEntries() })
  } catch (err) {
    const status = err.message === 'Not found' ? 404 : 400
    return NextResponse.json({ error: err.message || 'Failed' }, { status })
  }
}
