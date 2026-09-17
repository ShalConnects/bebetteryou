import Link from 'next/link'
import { DashPanel } from './ui'
import { analyticsRanges } from '@/config/analytics'
import { barWidths } from '@/libs/analytics'

export function RangeTabs({ active }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {analyticsRanges.map(({ id, label }) => (
        <Link
          key={id}
          href={`/dashboard?range=${id}`}
          className={id === active ? 'tag-active' : 'tag'}
          aria-current={id === active ? 'page' : undefined}
        >
          {label}
        </Link>
      ))}
    </div>
  )
}

/**
 * A ranked list where the bar is the background of the row rather than a column
 * beside it, so long page paths stay readable at narrow widths.
 */
export function BarList({ title, rows, metric, unit, empty, href }) {
  if (!rows.length) return <DashPanel title={title}><p className="text-sm text-quiet">{empty}</p></DashPanel>

  const widths = barWidths(rows, metric)

  return (
    <DashPanel title={title}>
      <ul className="space-y-1">
        {rows.map((row, i) => (
          <li key={row.key} className="relative flex items-center justify-between gap-4 px-2 py-2">
            <span
              className="absolute inset-y-0 left-0 bg-paper/10"
              style={{ width: `${widths[i]}%` }}
              aria-hidden
            />
            <span className="relative min-w-0 truncate text-sm text-body">
              {href ? (
                <Link href={href(row)} className="underline-offset-2 hover:underline">
                  {row.label}
                </Link>
              ) : (
                row.label
              )}
            </span>
            <span className="relative shrink-0 text-sm text-paper">
              {row[metric].toLocaleString('en-US')}
              {unit ? <span className="ml-1 text-quiet">{unit}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </DashPanel>
  )
}

/** Channel table — the one panel that answers "where should I spend my time". */
export function ChannelTable({ rows }) {
  if (!rows.length) {
    return (
      <DashPanel title="Channels">
        <p className="text-sm text-quiet">No traffic recorded yet.</p>
      </DashPanel>
    )
  }

  return (
    <DashPanel title="Channels">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.2em] text-quiet">
              <th className="py-3 pr-4 font-normal">Channel</th>
              <th className="py-3 pr-4 text-right font-normal">Visitors</th>
              <th className="py-3 pr-4 text-right font-normal">Views</th>
              <th className="py-3 pr-4 text-right font-normal">Downloads</th>
              <th className="py-3 text-right font-normal">Shares</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="py-3 pr-4 text-paper">{row.label}</td>
                <td className="py-3 pr-4 text-right text-quiet">{row.visitors.toLocaleString('en-US')}</td>
                <td className="py-3 pr-4 text-right text-quiet">{row.pageviews.toLocaleString('en-US')}</td>
                <td className="py-3 pr-4 text-right text-paper">{row.downloads.toLocaleString('en-US')}</td>
                <td className="py-3 text-right text-quiet">{row.shares.toLocaleString('en-US')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashPanel>
  )
}

/** Daily visitors as bare columns — enough to read a trend, no charting library. */
export function TrendChart({ daily }) {
  const widths = barWidths(daily, 'visitors')
  const busiest = daily.reduce((top, day) => Math.max(top, day.visitors), 0)

  return (
    <DashPanel title="Visitors per day">
      <div className="flex h-32 items-end gap-px" role="img" aria-label={`Daily visitors, peak ${busiest}`}>
        {daily.map((day, i) => (
          <div
            key={day.key}
            className="min-w-px flex-1 bg-paper/30"
            style={{ height: `${widths[i]}%` }}
            title={`${day.key}: ${day.visitors} visitors, ${day.pageviews} views`}
          />
        ))}
      </div>
      <div className="mt-3 flex justify-between text-[11px] uppercase tracking-[0.2em] text-quiet">
        <span>{daily[0]?.key}</span>
        <span>peak {busiest.toLocaleString('en-US')}</span>
        <span>{daily[daily.length - 1]?.key}</span>
      </div>
    </DashPanel>
  )
}
