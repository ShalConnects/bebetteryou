import OutreachBoard from '@/components/dashboard/OutreachBoard'
import { DashPage } from '@/components/dashboard/ui'
import { requireAdminPage } from '@/libs/dashboard-auth'
import { getStatus, previewBatch } from '@/libs/shal-outreach/run'

export const metadata = { title: 'ShalConnects Outreach' }
export const dynamic = 'force-dynamic'

export default async function OutreachPage() {
  await requireAdminPage()
  let status
  let preview
  try {
    status = await getStatus()
    preview = await previewBatch()
  } catch (error) {
    status = {
      listMissing: true,
      valid: 0,
      cleaned: 0,
      sentTotal: 0,
      unsubscribed: 0,
      bounced: 0,
      complained: 0,
      remaining: 0,
      usedToday: 0,
      cap: 100,
      roomToday: 100,
      hasResendKey: Boolean(process.env.SHALCONNECTS_RESEND_API_KEY?.trim()),
      hasWebhookSecret: Boolean(process.env.SHALCONNECTS_RESEND_WEBHOOK_SECRET?.trim()),
      webhookUrl: '',
      from: process.env.SHALCONNECTS_FROM || 'ShalConnects <hello@shalconnects.com>',
      storage: 'mongodb',
      recentSent: [],
      recentUnsubscribed: [],
      recentEvents: [],
      recentRemoved: [],
      loadError: error?.message || 'Failed to load outreach status',
    }
    preview = { ...status, batchSize: 0, nextEmails: [], subject: '', text: '' }
  }

  return (
    <DashPage
      title="Outreach"
      description="ShalConnects V9 · Shopify & WordPress · Mongo-backed · separate Resend from BeBetterYou quote mail."
    >
      <OutreachBoard initialStatus={status} initialPreview={preview} />
    </DashPage>
  )
}
