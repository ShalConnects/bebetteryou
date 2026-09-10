import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/libs/next-auth'
import { isAdminSession } from '@/libs/auth-helpers'
import { connectDB } from '@/libs/mongo'
import User from '@/models/User'
import ButtonCheckout from '@/components/ButtonCheckout'
import { appConfig } from '@/config/app'
import { adminOverview } from '@/libs/dashboard'
import { readQuotes } from '@/libs/quotes-store'
import { ActionLink, DashPanel, Stat } from '@/components/dashboard/ui'
import { PageIntro } from '@/components/site/ui'

export default async function Dashboard() {
  const session = await getServerSession(authOptions)
  const isAdmin = isAdminSession(session)
  const name = session?.user?.name

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
          <ActionLink href="/dashboard/analytics" title="Analytics">
            Channels, top pages, downloads and shares.
          </ActionLink>
          <ActionLink href="/dashboard/quotes/new" title="New quote">
            Generate a card and publish.
          </ActionLink>
          <ActionLink href="/dashboard/quotes" title="Manage quotes">
            Edit, regenerate, or delete cards.
          </ActionLink>
          <ActionLink href="/dashboard/tags" title="Manage tags">
            Tags and mood labels for Surprise.
          </ActionLink>
          <ActionLink href="/dashboard/scripture" title="Tradition passages">
            Scripture and reflections per tag theme.
          </ActionLink>
          <ActionLink href="/" title="View site">
            See the public homepage.
          </ActionLink>
        </div>

        <DashPanel title="Social">
          <ul className="space-y-2">
            {social.map(({ id, label, ready }) => (
              <li key={id} className="flex items-center justify-between text-sm">
                <span className="text-body">{label}</span>
                <span className={ready ? 'text-paper' : 'text-quiet'}>{ready ? 'Ready' : 'Not configured'}</span>
              </li>
            ))}
          </ul>
        </DashPanel>
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
