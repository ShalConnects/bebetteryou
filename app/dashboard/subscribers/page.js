import DigestNotify from '@/components/dashboard/DigestNotify'
import ImportSubscribers from '@/components/dashboard/ImportSubscribers'
import NewsletterDeliveryEvents from '@/components/dashboard/NewsletterDeliveryEvents'
import NotifySubscribers from '@/components/dashboard/NotifySubscribers'
import QuoteSendFailures from '@/components/dashboard/QuoteSendFailures'
import SubscriberTable from '@/components/dashboard/SubscriberTable'
import TestNewsletterMail from '@/components/dashboard/TestNewsletterMail'
import { PageIntro } from '@/components/site/ui'
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

export const metadata = { title: 'Subscribers' }
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

function parsePage(value) {
  const n = Number.parseInt(String(value || '1'), 10)
  return Number.isFinite(n) && n > 0 ? n : 1
}

function parseStatus(value) {
  const s = String(value || 'all')
  return s === 'active' || s === 'unsubscribed' ? s : 'all'
}

export default async function AdminSubscribersPage({ searchParams }) {
  await requireAdminPage()

  const params = (await searchParams) || {}
  const page = parsePage(params.page)
  const status = parseStatus(params.status)

  let list = []
  let failures = []
  let deliveryEvents = []
  let testEmails = []
  let pageMeta = {
    page: 1,
    pageSize: PAGE_SIZE,
    totalPages: 1,
    filteredTotal: 0,
    status: 'all',
    activeCount: 0,
    unsubscribedCount: 0,
    totalCount: 0,
  }
  let dbError = ''

  try {
    const [paged, failureRows, emails, deliveryRows] = await Promise.all([
      listNewsletterSubscribersPage({ page, pageSize: PAGE_SIZE, status }),
      listQuoteSendFailures(100),
      listNewsletterTestEmails(100),
      listNewsletterDeliveryEvents(100),
    ])
    pageMeta = {
      page: paged.page,
      pageSize: paged.pageSize,
      totalPages: paged.totalPages,
      filteredTotal: paged.filteredTotal,
      status: paged.status,
      activeCount: paged.activeCount,
      unsubscribedCount: paged.unsubscribedCount,
      totalCount: paged.totalCount,
    }
    list = paged.rows.map((row) => ({
      email: row.email,
      prefs: row.prefs || { quotes: false, blog: false, books: false },
      unsubscribedAt: row.unsubscribedAt ? String(row.unsubscribedAt) : null,
      createdAt: row.createdAt ? String(row.createdAt) : null,
    }))
    failures = failureRows.map((row) => ({
      id: String(row._id),
      email: row.email,
      kind: row.kind,
      error: row.error || 'Send failed',
      createdAt: row.createdAt ? String(row.createdAt) : null,
    }))
    deliveryEvents = deliveryRows.map((row) => ({
      id: String(row._id),
      email: row.email,
      type: row.type,
      message: row.message || '',
      bounceType: row.bounceType || '',
      bounceSubType: row.bounceSubType || '',
      createdAt: row.createdAt ? String(row.createdAt) : null,
    }))
    testEmails = emails
  } catch (error) {
    logError('Subscribers page: Mongo unavailable', error)
    dbError =
      'Could not reach MongoDB (connection timed out). In Atlas → Network Access, allow your current IP (or 0.0.0.0/0 for testing), confirm the cluster is not paused, then refresh.'
  }

  const posts = listPosts()
    .slice()
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .map((p) => ({ slug: p.slug, label: p.title }))
  const books = readBooks().map((b) => ({
    slug: b.slug,
    label: b.author ? `${b.title} — ${b.author}` : b.title,
  }))
  const quotes = (await readQuotes())
    .filter((q) => q?.slug && q?.src)
    .slice()
    .sort((a, b) => (b.n || 0) - (a.n || 0))
    .map((q) => ({
      slug: q.slug,
      label: q.author ? `#${q.n} — ${q.author}` : `#${q.n}`,
    }))

  return (
    <div className="space-y-10">
      <PageIntro title="Subscribers">
        Quote and digest sends go to a random 100 people who have not received quote mail in 30 days. Failed
        Resend deliveries still count toward that cooldown and are listed below.
      </PageIntro>

      {dbError ? <p className="text-sm text-red-400">{dbError}</p> : null}

      <section className="space-y-4">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-quiet">Import opted-in CSV</h2>
        <ImportSubscribers />
      </section>

      <section className="space-y-4">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-quiet">Send test email</h2>
        <TestNewsletterMail emails={testEmails} quotes={quotes} posts={posts} books={books} />
      </section>

      <section className="space-y-4">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-quiet">Quote digest</h2>
        <DigestNotify />
      </section>

      <section className="space-y-4">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-quiet">Notify — one quote</h2>
        <NotifySubscribers type="quote" options={quotes} />
      </section>

      <section className="space-y-4">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-quiet">Notify — blog</h2>
        <NotifySubscribers type="blog" options={posts} />
      </section>

      <section className="space-y-4">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-quiet">Notify — books</h2>
        <NotifySubscribers type="book" options={books} />
      </section>

      <section className="space-y-4">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-quiet">
          Failed quote sends ({failures.length})
        </h2>
        <p className="text-sm text-quiet">
          Resend failures from quote/digest batches. These addresses still sit in the 30-day cooldown.
        </p>
        <QuoteSendFailures failures={failures} />
      </section>

      <section className="space-y-4">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-quiet">
          Bounces & spam ({deliveryEvents.length})
        </h2>
        <p className="text-sm text-quiet">
          From Resend webhooks. Those addresses are auto-unsubscribed so we stop mailing them.
        </p>
        <NewsletterDeliveryEvents events={deliveryEvents} />
      </section>

      <section className="space-y-4">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-quiet">
          List ({pageMeta.totalCount})
        </h2>
        <SubscriberTable
          key={`${pageMeta.status}-${pageMeta.page}`}
          subscribers={list}
          page={pageMeta.page}
          pageSize={pageMeta.pageSize}
          totalPages={pageMeta.totalPages}
          filteredTotal={pageMeta.filteredTotal}
          status={pageMeta.status}
          activeCount={pageMeta.activeCount}
          unsubscribedCount={pageMeta.unsubscribedCount}
          totalCount={pageMeta.totalCount}
        />
      </section>
    </div>
  )
}
