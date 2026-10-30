import Link from 'next/link'
import { CircleCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatStatus } from '@/libs/print-format'
import { formatScheduleWhen, manageQuotesHref, slotStatus } from '@/libs/dashboard-ops'

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
const calendar = manageQuotesHref({ section: 'schedules' })

/** Today's to-dos, worst first. Upcoming posts live on the calendar, so only missed ones show here. */
export default function AttentionStrip({
  failures = [],
  orders = [],
  upcoming = [],
  pendingSocial = [],
  shortsBacklog = null,
}) {
  const overdue = upcoming.filter((row) => slotStatus(row) === 'overdue')
  const items = [
    failures.length && ['danger', 'Failed', `${plural(failures.length, 'schedule')} failed — retry from the calendar`, calendar],
    overdue.length && [
      'danger',
      'Overdue',
      `${overdue.map((r) => r.slug).join(', ')} missed ${formatScheduleWhen(overdue[0].runAt)} — goes out with the next 8 pm run`,
      calendar,
    ],
    shortsBacklog != null && shortsBacklog < 3 && [
      shortsBacklog ? 'warn' : 'danger',
      'Shorts',
      `YouTube Shorts queue: ${plural(shortsBacklog, 'day')} left — publish more cards`,
      manageQuotesHref({ section: 'new' }),
    ],
    ...orders.map((o) => [
      o.canFulfill ? 'danger' : 'warn',
      'Order',
      `${o.orderNumber} — ${formatStatus(o.status)} · ${o.customerName || o.customerEmail}`,
      o.href,
    ]),
    pendingSocial.length && [
      'muted',
      'Pending',
      `${pendingSocial.map((n) => n.label).join(', ')} not connected yet`,
      '/dashboard/integrations',
    ],
  ].filter(Boolean)

  if (!items.length) {
    return (
      <p className="flex items-center gap-2 text-muted-foreground">
        <CircleCheck className="size-4 text-primary" aria-hidden /> Nothing needs attention.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-border">
      {items.map(([variant, label, text, href]) => (
        <li key={text}>
          <Link href={href} className="flex items-center gap-3 py-2.5 hover:text-foreground">
            <Badge variant={variant} className="w-16 justify-center">
              {label}
            </Badge>
            <span className="min-w-0 sm:truncate">{text}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
