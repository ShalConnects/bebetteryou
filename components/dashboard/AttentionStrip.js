import Link from 'next/link'
import { formatScheduleWhen, manageQuotesHref } from '@/libs/dashboard-ops'

/**
 * Overview “Today” summary only — full failure detail lives on Quotes → Schedules.
 */
export default function AttentionStrip({ failures = [], upcoming = [], pendingSocial = [] }) {
  const empty = !failures.length && !upcoming.length && !pendingSocial.length
  if (empty) {
    return <p className="text-sm text-quiet">Nothing needs attention.</p>
  }

  return (
    <div className="space-y-2 text-sm">
      {failures.length ? (
        <p>
          <Link
            href={manageQuotesHref({ section: 'schedules' })}
            className="text-red-400 underline-offset-2 hover:underline"
          >
            {failures.length} schedule failure{failures.length === 1 ? '' : 's'}
          </Link>
          <span className="text-quiet"> — open Schedules to retry</span>
        </p>
      ) : null}

      {upcoming.length ? (
        <p className="text-quiet">
          Up next:{' '}
          {upcoming.map((row, i) => (
            <span key={row.id}>
              {i ? ' · ' : ''}
              <Link
                href={manageQuotesHref({ section: 'schedules' })}
                className="text-body underline-offset-2 hover:underline"
              >
                {row.slug}
              </Link>
              <span className="text-quiet"> {formatScheduleWhen(row.runAt)}</span>
            </span>
          ))}
        </p>
      ) : null}

      {pendingSocial.length ? (
        <p className="text-quiet">Pending: {pendingSocial.map((n) => n.label).join(', ')}</p>
      ) : null}
    </div>
  )
}
