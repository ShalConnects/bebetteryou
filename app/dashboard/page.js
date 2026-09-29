import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/libs/next-auth'
import { isAdminSession } from '@/libs/auth-helpers'
import { connectDB } from '@/libs/mongo'
import User from '@/models/User'
import ButtonCheckout from '@/components/ButtonCheckout'
import { adminActions } from '@/config/dashboard'
import { appConfig } from '@/config/app'
import { socials } from '@/config/site'
import { adminOverview } from '@/libs/dashboard'
import { formatScheduleWhen, manageQuotesHref } from '@/libs/dashboard-ops'
import { readQuotes } from '@/libs/quotes-store'
import AnalyticsBoard from '@/components/dashboard/AnalyticsBoard'
import AttentionStrip from '@/components/dashboard/AttentionStrip'
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
    const { stats, social, attention, networkActivity } = await adminOverview(await readQuotes())
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

        <DashPanel title="Today">
          <AttentionStrip {...attention} />
        </DashPanel>

        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <Stat label="Total quotes" value={stats.total} />
          <Stat label="Latest #" value={stats.latest || '—'} />
          <Stat label="Next card" value={`#${stats.next}`} />
          <Stat label="Social ready" value={`${readySocial}/${social.length}`} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {adminActions.map((a) => (
            <ActionLink key={a.href} href={a.href} title={a.title}>
              {a.body}
            </ActionLink>
          ))}
        </div>

        <DashPanel title="Social">
          {ytNote ? <p className="mb-4 text-sm text-paper">{ytNote}</p> : null}
          <ul className="space-y-2">
            {social.map(({ id, label, ready, pending, connectable }) => {
              const href = socialHref[id]
              const last = networkActivity[id]
              return (
                <li key={id} className="flex items-start justify-between gap-4 text-sm">
                  <span className="min-w-0">
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
                    {last ? (
                      <span className="mt-0.5 block text-xs text-quiet">
                        Last:{' '}
                        {last.ok ? (
                          <Link
                            href={manageQuotesHref({ quote: last.slug, section: 'cards' })}
                            className="text-quiet underline-offset-2 hover:underline"
                          >
                            ok · {last.slug}
                          </Link>
                        ) : (
                          <Link
                            href={manageQuotesHref({
                              quote: last.slug,
                              retry: id,
                              section: 'cards',
                            })}
                            className="text-red-400 underline-offset-2 hover:underline"
                          >
                            failed · {last.slug}
                          </Link>
                        )}
                        {last.at ? ` · ${formatScheduleWhen(last.at)}` : ''}
                      </span>
                    ) : null}
                  </span>
                  {ready ? (
                    <span className="shrink-0 text-paper">
                      Ready
                      {id === 'youtube' ? (
                        <>
                          {' · '}
                          <a
                            href="/api/social/youtube/connect"
                            className="underline-offset-2 hover:underline"
                          >
                            Reconnect
                          </a>
                        </>
                      ) : null}
                    </span>
                  ) : pending ? (
                    <span className="shrink-0 text-quiet">Pending</span>
                  ) : connectable ? (
                    <a
                      href="/api/social/youtube/connect"
                      className="shrink-0 text-paper underline-offset-2 hover:underline"
                    >
                      Connect
                    </a>
                  ) : (
                    <span className="shrink-0 text-quiet">Not configured</span>
                  )}
                </li>
              )
            })}
          </ul>
        </DashPanel>

        <DashSection
          id="analytics"
          title="Analytics"
          description="Channels, top pages, downloads and shares."
          defaultOpen={Boolean(params.range)}
          focus={Boolean(params.range)}
          persistKey="overview-analytics"
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
