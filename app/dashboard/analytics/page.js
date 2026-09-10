import { BarList, ChannelTable, RangeTabs, TrendChart } from '@/components/dashboard/AnalyticsPanels'
import { DashPanel, Stat } from '@/components/dashboard/ui'
import { PageIntro } from '@/components/site/ui'
import { resolveRange } from '@/config/analytics'
import { appConfig } from '@/config/app'
import { rangeStart, summarize } from '@/libs/analytics'
import { analyticsReady, listEvents } from '@/libs/analytics-store'
import { requireAdminPage } from '@/libs/dashboard-auth'

export const metadata = { title: 'Analytics' }

/** Numbers change every minute; a cached page would be worse than useless. */
export const dynamic = 'force-dynamic'

export default async function AnalyticsPage({ searchParams }) {
  await requireAdminPage()

  const { range } = (await searchParams) || {}
  const { id, days, label } = resolveRange(range)
  const ready = appConfig.features.enableAnalytics && analyticsReady()
  const events = ready ? await listEvents({ since: rangeStart(days) }) : []
  const data = summarize(events, { days })

  return (
    <div className="space-y-8">
      <PageIntro title="Analytics" aside={<RangeTabs active={id} />}>
        Where visitors come from and what they do once they arrive. Last {label.toLowerCase()}.
      </PageIntro>

      {!ready ? (
        <DashPanel title="Not collecting">
          {appConfig.features.enableAnalytics
            ? 'Set MONGODB_URI so events have somewhere to land. Local development without it writes to data/analytics-events.json instead.'
            : 'Tracking is off. Remove NEXT_PUBLIC_ENABLE_ANALYTICS=false to turn it back on.'}
        </DashPanel>
      ) : null}

      <div className="grid grid-cols-2 gap-6 md:grid-cols-5">
        <Stat label="Visitors" value={data.totals.visitors.toLocaleString('en-US')} />
        <Stat label="Page views" value={data.totals.pageviews.toLocaleString('en-US')} />
        <Stat label="Downloads" value={data.totals.downloads.toLocaleString('en-US')} />
        <Stat label="Shares" value={data.totals.shares.toLocaleString('en-US')} />
        <Stat label="Saves / 100 visits" value={data.totals.downloadRate} />
      </div>

      <TrendChart daily={data.daily} />

      <ChannelTable rows={data.channels} />

      <div className="grid gap-6 lg:grid-cols-2">
        <BarList
          title="Top pages"
          rows={data.pages}
          metric="pageviews"
          unit="views"
          empty="No page views yet."
          href={(row) => row.key}
        />
        <BarList
          title="Traffic sources"
          rows={data.sources}
          metric="visitors"
          empty="Everything so far is direct traffic."
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BarList
          title="Most downloaded quotes"
          rows={data.quotes}
          metric="downloads"
          empty="No downloads yet."
          href={(row) => `/quotes/${row.key}`}
        />
        <BarList
          title="Shares by destination"
          rows={data.shareTargets}
          metric="shares"
          empty="No shares yet."
        />
      </div>
    </div>
  )
}
