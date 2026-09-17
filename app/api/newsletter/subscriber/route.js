import { NextResponse } from 'next/server'
import { requireAdmin } from '@/libs/auth-helpers'
import { handleApiError } from '@/libs/api'
import { withApiLogging } from '@/libs/api-middleware'
import { unsubscribeNewsletterSubscriber } from '@/libs/newsletter'
import { newsletterDeleteSchema, validateSchema } from '@/libs/validation-schemas'

async function handlePost(request) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const body = await request.json().catch(() => null)
    const validation = validateSchema(newsletterDeleteSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message, details: validation.error.details },
        { status: 400 }
      )
    }

    const result = await unsubscribeNewsletterSubscriber(validation.data.email)
    if (!result.ok) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
    }
    return NextResponse.json({
      success: true,
      unsubscribed: true,
      prefs: result.lead.prefs,
    })
  } catch (error) {
    const errorResponse = handleApiError(error)
    if (errorResponse) return errorResponse
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 })
  }
}

export const POST = withApiLogging(handlePost)
