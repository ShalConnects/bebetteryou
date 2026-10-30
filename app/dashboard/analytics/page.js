import AnalyticsBoard from '@/components/dashboard/AnalyticsBoard'
import { DashPage } from '@/components/dashboard/ui'
import { requireAdminPage } from '@/libs/dashboard-auth'

export const metadata = { title: 'Analytics' }
export const dynamic = 'force-dynamic'

export default async function AdminAnalyticsPage({ searchParams }) {
  await requireAdminPage()
  const { range } = (await searchParams) || {}
  return (
    <DashPage title="Insights" description="Channels, top pages, downloads and shares.">
      <AnalyticsBoard range={range} />
    </DashPage>
  )
}
