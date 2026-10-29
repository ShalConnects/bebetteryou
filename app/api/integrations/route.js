import { NextResponse } from 'next/server'
import { requireAdmin } from '@/libs/auth-helpers'
import { fieldsToPatch } from '@/libs/integrations/credentials'
import { listIntegrationStatus } from '@/libs/integrations/status'
import { clearIntegration, saveIntegration } from '@/libs/integrations/store'

export async function GET() {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const status = await listIntegrationStatus()
  return NextResponse.json(status)
}

export async function POST(req) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const network = String(body?.network || '').trim()
  if (!network || network === 'youtube' || network === 'resend' || network === 'ses') {
    return NextResponse.json({ error: 'Network not editable here' }, { status: 400 })
  }

  try {
    if (body?.clear) {
      await clearIntegration(network)
      return NextResponse.json({ ok: true, cleared: true, ...(await listIntegrationStatus()) })
    }

    const patch = fieldsToPatch(network, body?.fields || {})
    const hasSomething =
      patch.accessToken ||
      patch.refreshToken ||
      Object.values(patch.extras || {}).some((v) => String(v || '').trim())
    if (!hasSomething) {
      return NextResponse.json({ error: 'Provide at least one field' }, { status: 400 })
    }

    /** Board/id saves are not an auth success — only OAuth sets lastOkAt. */
    await saveIntegration(network, { ...patch, lastError: '' })
    return NextResponse.json({ ok: true, ...(await listIntegrationStatus()) })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Save failed' }, { status: 400 })
  }
}
