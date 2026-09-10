import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/libs/auth-helpers'
import { deleteQuote, updateQuote } from '@/libs/manage-quote'
import { NextResponse } from 'next/server'

function revalidateQuote(slug) {
  for (const path of ['/quotes', `/quotes/${slug}`, '/', '/dashboard/quotes']) revalidatePath(path)
}

export async function PATCH(req, { params }) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { slug } = await params
  const body = await req.json().catch(() => null)

  try {
    const quote = await updateQuote(slug, {
      text: body?.text,
      author: body?.author,
      tags: body?.tags,
      theme: body?.theme,
      related: body?.related,
      regenerate: Boolean(body?.regenerate),
    })
    revalidateQuote(slug)
    return NextResponse.json(quote)
  } catch (err) {
    const status = err.message === 'Quote not found' ? 404 : 400
    return NextResponse.json({ error: err.message || 'Failed' }, { status })
  }
}

export async function DELETE(_req, { params }) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { slug } = await params

  try {
    await deleteQuote(slug)
    revalidateQuote(slug)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const status = err.message === 'Quote not found' ? 404 : 500
    return NextResponse.json({ error: err.message || 'Failed' }, { status })
  }
}
