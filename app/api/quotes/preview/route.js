import { requireAdmin } from '@/libs/auth-helpers'
import { countQuoteLines, renderQuoteCard } from '@/libs/quote-card.mjs'
import { normalizeAuthor, normalizeQuoteText } from '@/libs/quote-text'
import { nextQuoteN, readQuotes } from '@/libs/quotes-store'
import { NextResponse } from 'next/server'

export async function POST(req) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)

  try {
    const text = normalizeQuoteText(body?.text)
    const n = nextQuoteN(await readQuotes())
    const author = normalizeAuthor(body?.author)
    const buffer = await renderQuoteCard({ n, text, author })

    return NextResponse.json({
      n,
      lines: countQuoteLines(text),
      dataUrl: `data:image/jpeg;base64,${buffer.toString('base64')}`,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Preview failed' }, { status: 400 })
  }
}
