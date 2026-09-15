import { NextResponse } from 'next/server'
import { requireAdmin } from '@/libs/auth-helpers'
import { handleApiError } from '@/libs/api'
import { withApiLogging } from '@/libs/api-middleware'
import { sendTestWelcome } from '@/libs/newsletter'
import { newsletterTestWelcomeSchema, validateSchema } from '@/libs/validation-schemas'

export const maxDuration = 60

async function handlePost(request) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const body = await request.json().catch(() => null)
    const validation = validateSchema(newsletterTestWelcomeSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message, details: validation.error.details },
        { status: 400 }
      )
    }

    const result = await sendTestWelcome(validation.data.email)
    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Send failed' }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    const errorResponse = handleApiError(error)
    if (errorResponse) return errorResponse
    return NextResponse.json({ error: 'Failed to send test welcome' }, { status: 500 })
  }
}

export const POST = withApiLogging(handlePost)
