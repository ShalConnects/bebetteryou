import { BarList, ChannelTable, RangeTabs, TrendChart } from '@/components/dashboard/AnalyticsPanels'
import { DashPanel, Stat } from '@/components/dashboard/ui'
import { resolveRange } from '@/config/analytics'
import { appConfig } from '@/config/app'
import { rangeStart, summarize } from '@/libs/analytics'
import { analyticsReady, listEvents } from '@/libs/analytics-store'

/** Analytics body for the overview collapsible (and former /dashboard/analytics page). */
export default async function AnalyticsBoard({ range }) {
  const { id, days, label } = resolveRange(range)
  const ready = appConfig.features.enableAnalytics && analyticsReady()
  const events = ready ? await listEvents({ since: rangeStart(days) }) : []
  const data = summarize(events, { days })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-quiet">Last {label.toLowerCase()}.</p>
        <RangeTabs active={id} />
      </div>

      {!ready ? (
        <DashPanel title="Not collecting">
          {appConfig.features.enableAnalytics
            ? 'Set MONGODB_URI so events have somewhere to land. Local development without it writes to data/analytics-events.json instead.'
            : 'Tracking is off. Remove NEXT_PUBLIC_ENABLE_ANALYTICS=false to turn it back on.'}
        </DashPanel>
      ) : null}

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-5">
        <Stat label="Visitors" value={data.totals.visitors.toLocaleString('en-US')} />
        <Stat label="Page views" value={data.totals.pageviews.toLocaleString('en-US')} />
        <Stat label="Downloads" value={data.totals.downloads.toLocaleString('en-US')} />
        <Stat label="Shares" value={data.totals.shares.toLocaleString('en-US')} />
        <Stat label="Saves / 100 visits" value={data.totals.downloadRate} />
      </div>

      {data.practice.viewed || data.practice.completed || data.practice.plans ? (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat label="Practice views" value={data.practice.viewed.toLocaleString('en-US')} />
          <Stat label="Actions done" value={data.practice.completed.toLocaleString('en-US')} />
          <Stat label="Plans created" value={data.practice.plans.toLocaleString('en-US')} />
          <Stat label="Practice saves" value={data.practice.saves.toLocaleString('en-US')} />
        </div>
      ) : null}

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
