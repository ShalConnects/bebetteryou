import NotifySubscribers from '@/components/dashboard/NotifySubscribers'
import { PageIntro } from '@/components/site/ui'
import { listPosts } from '@/libs/blog'
import { readBooks } from '@/libs/books-store'
import { requireAdminPage } from '@/libs/dashboard-auth'
import { listNewsletterSubscribers } from '@/libs/newsletter'

export const metadata = { title: 'Subscribers' }

function prefLabel(prefs = {}) {
  const bits = []
  if (prefs.quotes) bits.push('quotes')
  if (prefs.blog) bits.push('blog')
  if (prefs.books) bits.push('books')
  return bits.length ? bits.join(', ') : 'none'
}

export default async function AdminSubscribersPage() {
  await requireAdminPage()

  const subscribers = await listNewsletterSubscribers()
  const posts = listPosts()
    .slice()
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .map((p) => ({ slug: p.slug, label: p.title }))
  const books = readBooks().map((b) => ({
    slug: b.slug,
    label: b.author ? `${b.title} — ${b.author}` : b.title,
  }))

  return (
    <div className="space-y-10">
      <PageIntro title="Subscribers">
        Newsletter list, preferences, and one-click notify for blog or book drops.
      </PageIntro>

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
          List ({subscribers.length})
        </h2>
        {subscribers.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.2em] text-quiet">
                  <th className="pb-3 pr-4 font-normal">Email</th>
                  <th className="pb-3 pr-4 font-normal">Prefs</th>
                  <th className="pb-3 pr-4 font-normal">Status</th>
                  <th className="pb-3 font-normal">Joined</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((row) => (
                  <tr key={String(row._id)} className="border-t border-line/40">
                    <td className="py-3 pr-4 text-paper">{row.email}</td>
                    <td className="py-3 pr-4 text-quiet">{prefLabel(row.prefs)}</td>
                    <td className="py-3 pr-4 text-quiet">
                      {row.unsubscribedAt ? 'unsubscribed' : 'active'}
                    </td>
                    <td className="py-3 text-quiet">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-quiet">No subscribers yet.</p>
        )}
      </section>
    </div>
  )
}
