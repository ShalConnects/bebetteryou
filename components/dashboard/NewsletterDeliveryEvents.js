'use client'

function whenLabel(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function typeLabel(type) {
  if (type === 'bounced') return 'Bounced'
  if (type === 'complained') return 'Spam complaint'
  return type || '—'
}

/** Admin list of Resend bounce / spam-complaint events. */
export default function NewsletterDeliveryEvents({ events }) {
  if (!events?.length) {
    return (
      <p className="text-sm text-quiet">
        No bounces or spam complaints yet. After you wire the Resend webhook, they appear here and those
        addresses are auto-unsubscribed.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[44rem] text-left text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.2em] text-quiet">
            <th className="pb-3 pr-4 font-normal">When</th>
            <th className="pb-3 pr-4 font-normal">Email</th>
            <th className="pb-3 pr-4 font-normal">Type</th>
            <th className="pb-3 font-normal">Detail</th>
          </tr>
        </thead>
        <tbody>
          {events.map((row) => (
            <tr key={row.id} className="border-t border-line/40">
              <td className="whitespace-nowrap py-3 pr-4 text-quiet">{whenLabel(row.createdAt)}</td>
              <td className="py-3 pr-4 text-paper">{row.email}</td>
              <td className="py-3 pr-4 text-red-400/90">{typeLabel(row.type)}</td>
              <td className="py-3 text-quiet">
                {row.message || '—'}
                {row.bounceType ? (
                  <span className="mt-0.5 block text-xs text-quiet/70">
                    {[row.bounceType, row.bounceSubType].filter(Boolean).join(' · ')}
                  </span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
