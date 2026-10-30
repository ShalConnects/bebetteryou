import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/libs/next-auth'
import { isAdminSession } from '@/libs/auth-helpers'
import { connectDB } from '@/libs/mongo'
import User from '@/models/User'
import ButtonCheckout from '@/components/ButtonCheckout'
import { appConfig } from '@/config/app'
import { adminOverview } from '@/libs/dashboard'
import { changeLabel } from '@/libs/analytics'
import { coveredDays, manageQuotesHref } from '@/libs/dashboard-ops'
import { readQuotes } from '@/libs/quotes-store'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import AttentionStrip from '@/components/dashboard/AttentionStrip'
import ScheduleCalendar from '@/components/dashboard/ScheduleCalendar'
import SocialStatus from '@/components/dashboard/SocialStatus'
import { DashPage, DashPanel, Stat } from '@/components/dashboard/ui'

/** Overview shows live counts; avoid a stale cached snapshot. */
export const dynamic = 'force-dynamic'

const todayLabel = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeZone: 'Asia/Dhaka' })
const count = (n) => (n == null ? '—' : n.toLocaleString('en-US'))

export default async function Dashboard({ searchParams }) {
  const session = await getServerSession(authOptions)
  const isAdmin = isAdminSession(session)
  const name = session?.user?.name
  const params = (await searchParams) || {}

  let hasAccess = Boolean(session?.user?.hasAccess)
  if (!isAdmin && session?.user?.id) {
    try {
      await connectDB()
      const dbUser = await User.findById(session.user.id).select('hasAccess name').lean()
      hasAccess = Boolean(dbUser?.hasAccess)
    } catch {
      /* owner login works without DB */
    }
  }

  if (isAdmin) {
    /** Analytics moved to its own page — keep old `?range=` links working. */
    if (params.range) redirect(`/dashboard/analytics?range=${encodeURIComponent(params.range)}`)
    const quotes = await readQuotes()
    const { stats, social, schedules, attention, networkActivity } = await adminOverview(quotes)
    const ready = social.filter((n) => n.ready).length

    return (
      <DashPage
        title={`Welcome${name ? `, ${name}` : ''}`}
        description={todayLabel.format(new Date())}
        actions={
          <Button asChild>
            <Link href={manageQuotesHref({ section: 'new' })}>
              <Plus aria-hidden /> New quote
            </Link>
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Quotes" value={stats.total} hint={`Next card #${stats.next}`} />
          <Stat
            label="Subscribers"
            value={count(stats.subscribers?.active)}
            hint={stats.subscribers ? `+${count(stats.subscribers.recent)} this week` : null}
          />
          <Stat
            label="Visitors · 7 days"
            value={count(stats.visitors?.now)}
            hint={stats.visitors ? changeLabel(stats.visitors.now, stats.visitors.prev, 7) || 'no visits the week before' : null}
          />
          <Stat label="Days covered" value={`${coveredDays(schedules, 7)}/7`} hint="next 7 days with a post" />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="min-w-0 space-y-4 lg:col-span-2">
            <DashPanel title="Needs attention">
              <AttentionStrip {...attention} />
            </DashPanel>
            <DashPanel
              title="Next 7 days"
              description="One post a day at 8 pm Bangladesh time."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href={manageQuotesHref({ section: 'schedules' })}>Calendar</Link>
                </Button>
              }
            >
              <ScheduleCalendar schedules={schedules} quotes={quotes} days={7} />
            </DashPanel>
          </div>
          {/* Desktop: as tall as the left column (h-0 + min-h-full adds no height of its own), list scrolls inside. */}
          <DashPanel
            title="Channels"
            description={`${ready} of ${social.length} ready`}
            className="lg:flex lg:h-0 lg:min-h-full lg:flex-col"
            contentClassName="scroll-quiet lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
          >
            <SocialStatus social={social} activity={networkActivity} />
          </DashPanel>
        </div>
      </DashPage>
    )
  }

  return (
    <DashPage
      title={`Welcome${name ? `, ${name}` : ''}`}
      description={`Quote library is public. ${hasAccess ? 'Paid access: Active' : 'Paid access: not required to browse.'}`}
    >

      {!hasAccess && appConfig.features?.enablePricing ? (
        <DashPanel title="Upgrade">
          <p className="mb-4 text-sm text-quiet">Unlock paid features with checkout.</p>
          <ButtonCheckout
            priceId={appConfig.stripePrices.pro}
            provider={appConfig.paymentProvider}
            className="btn w-full text-center"
          >
            Upgrade now
          </ButtonCheckout>
        </DashPanel>
      ) : null}

      <p>
        <Link href="/quotes" className="btn">
          Browse quotes
        </Link>
      </p>
    </DashPage>
  )
}
