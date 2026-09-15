import { NextResponse } from 'next/server'
import { handleApiError } from '@/libs/api'
import { withApiLogging } from '@/libs/api-middleware'
import { applyNewsletterManage, findByUnsubscribeToken } from '@/libs/newsletter'
import { rateLimit, rateLimitPresets } from '@/libs/rate-limit'
import { newsletterManageSchema, validateSchema } from '@/libs/validation-schemas'

async function handleGet(request) {
  try {
    const token = new URL(request.url).searchParams.get('t') || ''
    const lead = await findByUnsubscribeToken(token)
    if (!lead) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
    return NextResponse.json({
      email: lead.email,
      prefs: lead.prefs || { quotes: false, blog: false, books: false },
      unsubscribed: Boolean(lead.unsubscribedAt),
    })
  } catch (error) {
    const errorResponse = handleApiError(error)
    if (errorResponse) return errorResponse
    return NextResponse.json({ error: 'Failed to load preferences' }, { status: 500 })
  }
}

async function handlePost(request) {
  try {
    const limited = await rateLimit(
      request,
      rateLimitPresets.moderate.limit,
      rateLimitPresets.moderate.windowMs
    )
    if (limited) return limited

    const body = await request.json().catch(() => null)
    const validation = validateSchema(newsletterManageSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message, details: validation.error.details },
        { status: 400 }
      )
    }

    const lead = await applyNewsletterManage(validation.data)
    if (!lead) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })

    return NextResponse.json({
      success: true,
      prefs: lead.prefs,
      unsubscribed: Boolean(lead.unsubscribedAt),
    })
  } catch (error) {
    const errorResponse = handleApiError(error)
    if (errorResponse) return errorResponse
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
  }
}

export const GET = withApiLogging(handleGet)
export const POST = withApiLogging(handlePost)
