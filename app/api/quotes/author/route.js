import { requireAdmin } from '@/libs/auth-helpers'
import { findQuoteAuthor } from '@/libs/quote-author'
import { NextResponse } from 'next/server'

export async function POST(req) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  const author = await findQuoteAuthor(body?.text)
  return NextResponse.json({ author })
}
