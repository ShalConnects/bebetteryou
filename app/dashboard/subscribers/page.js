import DigestNotify from '@/components/dashboard/DigestNotify'
import ImportSubscribers from '@/components/dashboard/ImportSubscribers'
import NotifySubscribers from '@/components/dashboard/NotifySubscribers'
import QuoteSendFailures from '@/components/dashboard/QuoteSendFailures'
import SubscriberTable from '@/components/dashboard/SubscriberTable'
import TestNewsletterMail from '@/components/dashboard/TestNewsletterMail'
import { PageIntro } from '@/components/site/ui'
import { listPosts } from '@/libs/blog'
import { readBooks } from '@/libs/books-store'
import { requireAdminPage } from '@/libs/dashboard-auth'
import { logError } from '@/libs/logger'
import { listNewsletterSubscribers, listQuoteSendFailures } from '@/libs/newsletter'
import { readQuotes } from '@/libs/quotes-store'

export const metadata = { title: 'Subscribers' }

export default async function AdminSubscribersPage() {
  await requireAdminPage()

  let list = []
  let failures = []
  let dbError = ''
  try {
    const [subscribers, failureRows] = await Promise.all([
      listNewsletterSubscribers(),
      listQuoteSendFailures(100),
    ])
    list = subscribers.map((row) => ({
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
  } catch (error) {
    logError('Subscribers page: Mongo unavailable', error)
    dbError =
      'Could not reach MongoDB (connection timed out). In Atlas → Network Access, allow your current IP (or 0.0.0.0/0 for testing), confirm the cluster is not paused, then refresh.'
  }

  // Include unsubscribed so you can still test templates to your own address.
  const testEmails = list.map((row) => row.email).filter(Boolean)

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
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-quiet">List ({list.length})</h2>
        <SubscriberTable subscribers={list} />
      </section>
    </div>
  )
}
