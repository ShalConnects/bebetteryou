import { NextResponse } from 'next/server'
import { addUnsubscribe, verifyUnsubSig } from '@/libs/shal-outreach/store'

export const runtime = 'nodejs'

/**
 * One-click / signed unsubscribe for ShalConnects outreach (List-Unsubscribe).
 * GET or POST ?email=&t=
 */
async function handle(request) {
  const url = new URL(request.url)
  let email = url.searchParams.get('email') || ''
  let t = url.searchParams.get('t') || ''

  if (request.method === 'POST') {
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => ({}))
      email = body.email || email
      t = body.t || t
    } else {
      const form = await request.formData().catch(() => null)
      if (form) {
        email = String(form.get('email') || email)
        t = String(form.get('t') || t)
      }
    }
  }

  email = String(email).trim().toLowerCase()
  if (!email.includes('@') || !verifyUnsubSig(email, t)) {
    return NextResponse.json({ error: 'Invalid unsubscribe link' }, { status: 400 })
  }

  const result = await addUnsubscribe(email, 'list-unsubscribe')
  return NextResponse.json({
    ok: true,
    email: result.email,
    added: result.added,
    message: result.added ? 'Unsubscribed' : 'Already unsubscribed',
  })
}

export const GET = handle
export const POST = handle
