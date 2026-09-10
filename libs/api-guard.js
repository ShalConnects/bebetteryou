import { NextResponse } from 'next/server'
import { requireAdmin } from './auth-helpers'
import { rateLimit, rateLimitPresets } from './rate-limit'
import { validateSchema } from './validation-schemas'

/**
 * Shared route preamble: feature flag, rate limit, admin gate, body validation.
 * Returns `{ data }` on success or a Response to return as-is.
 */
export async function guard(request, { schema, preset = rateLimitPresets.moderate, admin = false, enabled = true } = {}) {
  if (!enabled) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const limited = await rateLimit(request, preset.limit, preset.windowMs)
  if (limited) return limited

  if (admin) {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
  }

  if (!schema) return { data: null }

  const body = await request.json().catch(() => null)
  const result = validateSchema(schema, body)
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.message, details: result.error.details },
      { status: 400 }
    )
  }
  return { data: result.data }
}
