import { NextResponse } from 'next/server'
import { createUserWithPassword } from '@/libs/user-helpers'
import { rateLimit, rateLimitPresets } from '@/libs/rate-limit'
import { registerSchema, validateSchema } from '@/libs/validation-schemas'
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
    const result = validateSchema(registerSchema, body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.details?.[0]?.message || result.error.message },
        { status: 400 }
      )
    }

    const { name, email, password } = result.data
    await createUserWithPassword(email, password, name)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error.message === 'User already exists') {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
    }
    const errorResponse = handleApiError(error)
    if (errorResponse) return errorResponse
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
