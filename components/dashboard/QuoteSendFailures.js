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

/** Admin list of quote/digest Resend failures (still counted in 30-day cooldown). */
export default function QuoteSendFailures({ failures }) {
  if (!failures?.length) {
    return <p className="text-sm text-quiet">No failed quote sends recorded.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.2em] text-quiet">
            <th className="pb-3 pr-4 font-normal">When</th>
            <th className="pb-3 pr-4 font-normal">Email</th>
            <th className="pb-3 pr-4 font-normal">Kind</th>
            <th className="pb-3 font-normal">Error</th>
          </tr>
        </thead>
        <tbody>
          {failures.map((row) => (
            <tr key={row.id} className="border-t border-line/40">
              <td className="py-3 pr-4 text-quiet whitespace-nowrap">{whenLabel(row.createdAt)}</td>
              <td className="py-3 pr-4 text-paper">{row.email}</td>
              <td className="py-3 pr-4 text-quiet">{row.kind}</td>
              <td className="py-3 text-red-400/90">{row.error}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
