import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/libs/next-auth'
import { isAdminSession } from '@/libs/auth-helpers'
import { connectDB } from '@/libs/mongo'
import User from '@/models/User'
import ButtonCheckout from '@/components/ButtonCheckout'
import { appConfig } from '@/config/app'
import { socials } from '@/config/site'
import { adminOverview } from '@/libs/dashboard'
import { readQuotes } from '@/libs/quotes-store'
import AnalyticsBoard from '@/components/dashboard/AnalyticsBoard'
import { ActionLink, DashPanel, DashSection, Stat } from '@/components/dashboard/ui'
import { PageIntro } from '@/components/site/ui'

/** Overview hosts live analytics; avoid a stale cached snapshot. */
export const dynamic = 'force-dynamic'

const socialHref = Object.fromEntries(socials.map((s) => [s.id, s.href]))

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
    const { stats, social } = await adminOverview(await readQuotes())
    const readySocial = social.filter((n) => n.ready).length
    const yt = params.youtube
    const ytNote =
      yt === 'connected'
        ? 'YouTube connected. You can post Shorts from this dashboard.'
        : yt
          ? 'YouTube connect failed. Add the callback URL in Google Cloud and try Connect again.'
          : ''

    return (
      <div className="space-y-8">
        <PageIntro title={`Welcome${name ? `, ${name}` : ''}`}>Quote library and publishing.</PageIntro>

        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <Stat label="Total quotes" value={stats.total} />
          <Stat label="Latest #" value={stats.latest || '—'} />
          <Stat label="Next card" value={`#${stats.next}`} />
          <Stat label="Social ready" value={`${readySocial}/${social.length}`} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ActionLink href="/dashboard/quotes" title="Manage quotes">
            New cards, schedules, and library edits.
          </ActionLink>
          <ActionLink href="/dashboard/tags" title="Tags & scripture">
            Mood labels, content lanes, and tradition passages per theme.
          </ActionLink>
          <ActionLink href="/" title="View site">
            See the public homepage.
          </ActionLink>
        </div>

        <DashPanel title="Social">
          {ytNote ? <p className="mb-4 text-sm text-paper">{ytNote}</p> : null}
          <ul className="space-y-2">
            {social.map(({ id, label, ready, pending, connectable }) => {
              const href = socialHref[id]
              return (
                <li key={id} className="flex items-center justify-between text-sm">
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-body underline-offset-2 hover:underline"
                    >
                      {label}
                    </a>
                  ) : (
                    <span className="text-body">{label}</span>
                  )}
                  {ready ? (
                    <span className="text-paper">Ready</span>
                  ) : pending ? (
                    <span className="text-quiet">Pending approval</span>
                  ) : connectable ? (
                    <a href="/api/social/youtube/connect" className="text-paper underline-offset-2 hover:underline">
                      Connect
                    </a>
                  ) : (
                    <span className="text-quiet">Not configured</span>
                  )}
                </li>
              )
            })}
          </ul>
        </DashPanel>

        <DashSection
          title="Analytics"
          description="Channels, top pages, downloads and shares."
          defaultOpen={Boolean(params.range)}
        >
          <AnalyticsBoard range={params.range} />
        </DashSection>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageIntro title={`Welcome${name ? `, ${name}` : ''}`}>
        Quote library is public.{' '}
        <span className={hasAccess ? 'text-paper' : 'text-quiet'}>
          {hasAccess ? 'Paid access: Active' : 'Paid access: not required to browse.'}
        </span>
      </PageIntro>

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
    </div>
  )
}
