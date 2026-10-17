import AnalyticsBoard from '@/components/dashboard/AnalyticsBoard'
import { PageIntro } from '@/components/site/ui'
import { requireAdminPage } from '@/libs/dashboard-auth'

export const metadata = { title: 'Analytics' }
export const dynamic = 'force-dynamic'

export default async function AdminAnalyticsPage({ searchParams }) {
  await requireAdminPage()
  const { range } = (await searchParams) || {}
  return (
    <div className="space-y-8">
      <PageIntro title="Analytics">Channels, top pages, downloads and shares.</PageIntro>
      <AnalyticsBoard range={range} />
    </div>
  )
}
