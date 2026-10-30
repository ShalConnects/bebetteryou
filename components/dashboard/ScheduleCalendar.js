import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { adminDay, adminDays, manageQuotesHref, slotBadges, slotDay, slotStatus } from '@/libs/dashboard-ops'
import { cn } from '@/libs/cn'

/**
 * One post slot per day (20:00 Bangladesh). Overdue rows sit on the next run day, since that's
 * when they'll actually go out; an empty day links to New quote with that date picked.
 */
export default function ScheduleCalendar({ schedules = [], quotes = [], postsBySlug, days = 14 }) {
  const now = Date.now()
  const today = adminDay(now)
  const cover = Object.fromEntries(quotes.map((q) => [q.slug, q]))
  const byDay = {}
  for (const row of schedules) {
    if (!row.runAt || row.status === 'canceled') continue
    ;(byDay[slotDay(row, now, postsBySlug)] ||= []).push({ ...row, status: slotStatus(row, now, postsBySlug) })
  }

  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {adminDays(days, now).map(({ key, label }) => {
        const rows = byDay[key] || []
        const [first] = rows
        const quote = first && cover[first.slug]
        const [variant, text] = first ? slotBadges[first.status] || ['muted', first.status] : ['muted', 'Empty']
        return (
          <li key={key}>
            <Link
              href={manageQuotesHref(first ? { quote: first.slug, section: 'cards' } : { section: 'new', date: key })}
              className={cn(
                'flex h-full flex-col gap-2 rounded-lg border border-border bg-card p-2 transition-colors hover:border-primary/50',
                key === today && 'ring-1 ring-primary/60'
              )}
            >
              <span className="flex items-center justify-between text-xs text-muted-foreground">
                {label}
                {rows.length > 1 ? <span>+{rows.length - 1}</span> : null}
              </span>
              <span className="aspect-[4/5] overflow-hidden rounded-md bg-muted">
                {quote?.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={quote.src} alt={`#${quote.n}`} loading="lazy" className="size-full object-cover" />
                ) : null}
              </span>
              <span className="flex flex-col items-start gap-1">
                {first ? <span className="max-w-full truncate text-xs text-foreground">{first.slug}</span> : null}
                <Badge variant={variant}>{text}</Badge>
              </span>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
