import CleanupSuppressions from '@/components/dashboard/CleanupSuppressions'
import DigestNotify from '@/components/dashboard/DigestNotify'
import ImportSubscribers from '@/components/dashboard/ImportSubscribers'
import NewsletterDeliveryEvents from '@/components/dashboard/NewsletterDeliveryEvents'
import NotifySubscribers from '@/components/dashboard/NotifySubscribers'
import QuoteSendFailures from '@/components/dashboard/QuoteSendFailures'
import SubscriberTable from '@/components/dashboard/SubscriberTable'
import TestNewsletterMail from '@/components/dashboard/TestNewsletterMail'
import { DashPage, DashPanel } from '@/components/dashboard/ui'
import { audienceTabs, pickTab } from '@/config/dashboard'
import { listPosts } from '@/libs/blog'
import { readBooks } from '@/libs/books-store'
import { requireAdminPage } from '@/libs/dashboard-auth'
import { logError } from '@/libs/logger'
import {
  listNewsletterSubscribersPage,
  listNewsletterTestEmails,
  listQuoteSendFailures,
} from '@/libs/newsletter'
import { listNewsletterDeliveryEvents } from '@/libs/resend-webhook'
import { readQuotes } from '@/libs/quotes-store'

export const metadata = { title: 'Audience' }
export const dynamic = 'force-dynamic'

const DEFAULT_PAGE_SIZE = 50

function parsePage(value) {
  const n = Number.parseInt(String(value || '1'), 10)
  return Number.isFinite(n) && n > 0 ? n : 1
}

function parseStatus(value) {
  const s = String(value || 'all')
  return s === 'active' || s === 'unsubscribed' ? s : 'all'
}

function parsePageSize(value) {
  const n = Number.parseInt(String(value || String(DEFAULT_PAGE_SIZE)), 10)
  if (!Number.isFinite(n)) return DEFAULT_PAGE_SIZE
  return Math.min(Math.max(n, 10), 200)
}

const str = (v) => (v ? String(v) : null)

const subscriberRow = (row) => ({
  email: row.email,
  prefs: row.prefs || { quotes: false, blog: false, books: false },
  unsubscribedAt: str(row.unsubscribedAt),
  createdAt: str(row.createdAt),
})

const failureRow = (row) => ({
  id: String(row._id),
  email: row.email,
  kind: row.kind,
  error: row.error || 'Send failed',
  createdAt: str(row.createdAt),
})

const deliveryRow = (row) => ({
  id: String(row._id),
  email: row.email,
  type: row.type,
  message: row.message || '',
  bounceType: row.bounceType || '',
  bounceSubType: row.bounceSubType || '',
  createdAt: str(row.createdAt),
})

const pick = (list, label) => list.map((x) => ({ slug: x.slug, label: label(x) }))

/** Each tab reads only its own collections. */
const tabs = {
  async list(params) {
    const { rows, ...meta } = await listNewsletterSubscribersPage({
      page: parsePage(params.page),
      pageSize: parsePageSize(params.pageSize),
      status: parseStatus(params.status),
    })
    return (
      <DashPanel>
        <SubscriberTable subscribers={rows.map(subscriberRow)} {...meta} />
      </DashPanel>
    )
  },
  async sends() {
    const [failures, events] = await Promise.all([listQuoteSendFailures(100), listNewsletterDeliveryEvents(100)])
    return (
      <>
        <DashPanel
          title={`Failed batch sends (${failures.length})`}
          description="Resend failures from quote, digest, blog and book batches. Those addresses still sit in that channel’s 30-day cooldown."
        >
          <QuoteSendFailures failures={failures.map(failureRow)} />
        </DashPanel>
        <DashPanel
          title={`Bounces & spam (${events.length})`}
          description="From Resend webhooks. These addresses are auto-unsubscribed."
        >
          <CleanupSuppressions />
          <NewsletterDeliveryEvents events={events.map(deliveryRow)} />
        </DashPanel>
      </>
    )
  },
  async tools() {
    const posts = pick(
      [...listPosts()].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))),
      (p) => p.title
    )
    const books = pick(readBooks(), (b) => (b.author ? `${b.title} — ${b.author}` : b.title))
    const quotes = pick(
      (await readQuotes()).filter((q) => q?.slug && q?.src).sort((a, b) => (b.n || 0) - (a.n || 0)),
      (q) => (q.author ? `#${q.n} — ${q.author}` : `#${q.n}`)
    )
    const tools = [
      ['Import opted-in CSV', <ImportSubscribers key="i" />],
      [
        'Send test email',
        <TestNewsletterMail key="t" emails={await listNewsletterTestEmails(100).catch(() => [])} quotes={quotes} posts={posts} books={books} />,
      ],
      ['Quote digest', <DigestNotify key="d" />],
      ['Notify — one quote', <NotifySubscribers key="q" type="quote" options={quotes} />],
      ['Notify — blog', <NotifySubscribers key="b" type="blog" options={posts} />],
      ['Notify — books', <NotifySubscribers key="k" type="book" options={books} />],
    ]
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {tools.map(([title, tool]) => (
          <DashPanel key={title} title={title}>
            {tool}
          </DashPanel>
        ))}
      </div>
    )
  },
}

export default async function AdminSubscribersPage({ searchParams }) {
  await requireAdminPage()
  const params = (await searchParams) || {}
  const active = pickTab(audienceTabs, params.section)
  let body
  try {
    body = await tabs[active](params)
  } catch (error) {
    logError('Subscribers page: Mongo unavailable', error)
    body = (
      <p className="text-sm text-red-400">
        Could not reach MongoDB. In Atlas → Network Access, allow your current IP and confirm the cluster is not
        paused, then refresh.
      </p>
    )
  }

  return (
    <DashPage
      title="Audience"
      description="Quote sends go to 100 random subscribers who haven’t had quote mail in 30 days, and only on days a social post succeeds."
      tabs={audienceTabs}
      active={active}
    >
      {body}
    </DashPage>
  )
}
