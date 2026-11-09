import { NextResponse } from 'next/server'
import { requireAdmin } from '@/libs/auth-helpers'
import { handleApiError } from '@/libs/api'
import { withApiLogging } from '@/libs/api-middleware'
import {
  createOutreachContact,
  getSendProgress,
  getStatus,
  importCsv,
  listOutreachContacts,
  patchOutreachContact,
  previewBatch,
  removeOutreachContact,
  resetOutreachSent,
  restoreOutreachContact,
  sendSelfTest,
  sendTodayBatch,
  unsubscribeEmail,
} from '@/libs/shal-outreach/run'

export const maxDuration = 300

async function handleGet(request) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  const url = new URL(request.url)
  const view = url.searchParams.get('view') || 'status'
  if (view === 'preview') return NextResponse.json(await previewBatch())
  if (view === 'send-progress') return NextResponse.json(await getSendProgress())
  if (view === 'contacts') {
    return NextResponse.json(
      await listOutreachContacts({
        q: url.searchParams.get('q') || '',
        filter: url.searchParams.get('filter') || 'all',
        page: Number(url.searchParams.get('page') || 1),
        pageSize: Number(url.searchParams.get('pageSize') || 50),
      })
    )
  }
  return NextResponse.json(await getStatus())
}

async function handlePost(request) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const body = await request.json().catch(() => null)
    const action = String(body?.action || '')
    if (action === 'self') return NextResponse.json(await sendSelfTest())
    if (action === 'send') return NextResponse.json(await sendTodayBatch())
    if (action === 'import') {
      return NextResponse.json(
        await importCsv(body?.csv, {
          confirmedOptIn: Boolean(body?.confirmedOptIn),
          mode: body?.mode === 'replace' ? 'replace' : 'merge',
        })
      )
    }
    if (action === 'unsubscribe') {
      return NextResponse.json(await unsubscribeEmail(body?.email))
    }
    if (action === 'contact-add') {
      return NextResponse.json(await createOutreachContact({ email: body?.email, name: body?.name }))
    }
    if (action === 'contact-update') {
      return NextResponse.json(
        await patchOutreachContact({
          email: body?.email,
          name: body?.name,
          newEmail: body?.newEmail,
        })
      )
    }
    if (action === 'contact-delete') {
      return NextResponse.json(await removeOutreachContact(body?.email))
    }
    if (action === 'contact-clear-sent') {
      return NextResponse.json(await resetOutreachSent(body?.email))
    }
    if (action === 'contact-resubscribe') {
      return NextResponse.json(await restoreOutreachContact(body?.email))
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    return handleApiError(error)
  }
}

export const GET = withApiLogging(handleGet)
export const POST = withApiLogging(handlePost)
