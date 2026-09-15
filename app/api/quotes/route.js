import { requireAdmin } from '@/libs/auth-helpers'
import { assertQuoteFits } from '@/libs/quote-card.mjs'
import { createQuote } from '@/libs/create-quote'
import { logError } from '@/libs/logger'
import { notifyQuoteSubscribers } from '@/libs/newsletter'
import { normalizeQuoteText } from '@/libs/quote-text'
import { nextQuoteN, readQuotes } from '@/libs/quotes-store'
import { revalidatePath } from 'next/cache'
import { after, NextResponse } from 'next/server'

/** Fan-out to subscribers can take a while after the card is saved. */
export const maxDuration = 60

export async function GET() {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  return NextResponse.json({ next: nextQuoteN(await readQuotes()) })
}

export async function POST(req) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)

  try {
    const text = normalizeQuoteText(body?.text)
    assertQuoteFits(text)
    const quote = await createQuote({
      text,
      author: body.author,
      tags: Array.isArray(body.tags) ? body.tags : [],
      theme: body.theme,
    })

    revalidatePath('/quotes')
    revalidatePath(`/quotes/${quote.slug}`)
    revalidatePath('/')

    // Keep the serverless invocation alive until Resend fan-out finishes.
    after(() =>
      notifyQuoteSubscribers(quote).catch((error) => {
        logError('Quote subscriber notify failed', error, { slug: quote.slug })
      })
    )

    return NextResponse.json(quote, { status: 201 })
  } catch (err) {
    const bad =
      err.message === 'text required' ||
      err.message?.includes('characters') ||
      err.message?.includes('lines')
    return NextResponse.json({ error: err.message || 'Failed to create quote' }, { status: bad ? 400 : 500 })
  }
}
