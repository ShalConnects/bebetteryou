import { NextResponse } from 'next/server'
import { requireAdmin } from '@/libs/auth-helpers'
import { handleApiError } from '@/libs/api'
import { withApiLogging } from '@/libs/api-middleware'
import { getPost } from '@/libs/blog'
import { readBooks } from '@/libs/books-store'
import {
  notifyBlogSubscribers,
  notifyBookSubscribers,
  notifyQuoteDigest,
  notifyQuoteSubscribers,
} from '@/libs/newsletter'
import { readQuotes } from '@/libs/quotes-store'
import { newsletterNotifySchema, validateSchema } from '@/libs/validation-schemas'

/** Sequential Resend fan-out for quote/blog/book/digest drops. */
export const maxDuration = 300

async function handlePost(request) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const body = await request.json().catch(() => null)
    const validation = validateSchema(newsletterNotifySchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message, details: validation.error.details },
        { status: 400 }
      )
    }

    const { type, slug } = validation.data

    if (type === 'digest') {
      const result = await notifyQuoteDigest(6)
      return NextResponse.json({ success: true, ...result })
    }

    if (type === 'blog') {
      const post = getPost(slug)
      if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      const result = await notifyBlogSubscribers(post)
      return NextResponse.json({ success: true, ...result })
    }

    if (type === 'book') {
      const book = readBooks().find((b) => b.slug === slug)
      if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })
      const result = await notifyBookSubscribers(book)
      return NextResponse.json({ success: true, ...result })
    }

    const quote = (await readQuotes()).find((q) => q.slug === slug)
    if (!quote?.src) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    const result = await notifyQuoteSubscribers(quote)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const errorResponse = handleApiError(error)
    if (errorResponse) return errorResponse
    return NextResponse.json({ error: 'Failed to notify subscribers' }, { status: 500 })
  }
}

export const POST = withApiLogging(handlePost)
