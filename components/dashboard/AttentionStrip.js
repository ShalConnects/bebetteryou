import Link from 'next/link'
import { formatStatus } from '@/libs/print-format'
import { formatScheduleWhen, manageQuotesHref } from '@/libs/dashboard-ops'

const link = 'underline-offset-2 hover:underline'
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

/**
 * Overview “Today”: what needs a hand first (failures, orders), then what runs next.
 * Full detail lives on Quotes → Schedules and Print.
 */
export default function AttentionStrip({
  failures = [],
  orders = [],
  upcoming = [],
  pendingSocial = [],
  shortsBacklog = null,
}) {
  const lowShorts = shortsBacklog != null && shortsBacklog < 3
  if (
    !failures.length &&
    !orders.length &&
    !upcoming.length &&
    !pendingSocial.length &&
    !lowShorts
  ) {
    return <p className="text-sm text-quiet">Nothing needs attention.</p>
  }

  return (
    <ul className="space-y-2 text-sm">
      {failures.length ? (
        <li>
          <Link href={manageQuotesHref({ section: 'schedules' })} className={`text-red-400 ${link}`}>
            {plural(failures.length, 'schedule failure')}
          </Link>
          <span className="text-quiet"> — open Schedules to retry</span>
        </li>
      ) : null}

      {orders.map((o) => (
        <li key={o.orderNumber}>
          <Link href={o.href} className={`${o.canFulfill ? 'text-red-400' : 'text-paper'} ${link}`}>
            Print order {o.orderNumber}
          </Link>
          <span className="text-quiet">
            {' '}
            — {formatStatus(o.status)} · {o.customerName || o.customerEmail}
          </span>
        </li>
      ))}

      {upcoming.map((row, i) => (
        <li key={row.id} className="text-quiet">
          {i ? 'Then ' : 'Next post '}
          <Link href={manageQuotesHref({ section: 'schedules' })} className={`text-body ${link}`}>
            {row.slug}
          </Link>{' '}
          · {formatScheduleWhen(row.runAt)}
        </li>
      ))}

      {pendingSocial.length ? (
        <li className="text-quiet">Pending: {pendingSocial.map((n) => n.label).join(', ')}</li>
      ) : null}

      {lowShorts ? (
        <li>
          <span className={shortsBacklog === 0 ? 'text-red-400' : 'text-quiet'}>
            YouTube Shorts queue: {plural(shortsBacklog, 'day')} left
          </span>
          <span className="text-quiet"> — publish more cards (daily cron, 14:00 UTC)</span>
        </li>
      ) : null}
    </ul>
  )
}
