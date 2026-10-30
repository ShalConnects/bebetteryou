import { NextResponse } from 'next/server'
import { requestMagicLink } from '@/libs/magic-link'
import { hit, rateLimit, rateLimitPresets } from '@/libs/rate-limit'
import { magicLinkSchema, validateSchema } from '@/libs/validation-schemas'
import { handleApiError } from '@/libs/api'

export async function POST(request) {
  const limited = await rateLimit(
    request,
    rateLimitPresets.strict.limit,
    rateLimitPresets.strict.windowMs
  )
  if (limited) return limited

  try {
    const body = await request.json()
    const result = validateSchema(magicLinkSchema, body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.details?.[0]?.message || result.error.message },
        { status: 400 }
      )
    }

    // Per-inbox cap too, so nobody can flood one address from many IPs.
    const { limit, windowMs } = rateLimitPresets.strict
    if (!(await hit(`magic:${result.data.email.toLowerCase()}`, limit / 2, windowMs))) {
      await requestMagicLink(result.data.email)
    }
    // Always succeed to avoid email enumeration
    return NextResponse.json({ success: true })
  } catch (error) {
    const errorResponse = handleApiError(error)
    if (errorResponse) return errorResponse
    return NextResponse.json({ error: 'Failed to send magic link' }, { status: 500 })
  }
}
