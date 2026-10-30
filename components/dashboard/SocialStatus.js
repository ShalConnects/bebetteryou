import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatScheduleWhen, manageQuotesHref } from '@/libs/dashboard-ops'

function state({ ready, pending, connectable, reconnect }, last) {
  if (ready) return last && !last.ok ? ['danger', 'Last failed'] : ['default', 'Ready']
  if (pending) return ['muted', 'Pending']
  if (reconnect) return ['danger', 'Reconnect']
  return connectable ? ['warn', 'Connect'] : ['muted', 'Off']
}

/** One line per network: status, then the last card it posted. OAuth networks reconnect in one click. */
export default function SocialStatus({ social = [], activity = {} }) {
  return (
    <ul className="divide-y divide-border">
      {social.map((net) => {
        const last = activity[net.id]
        const [variant, text] = state(net, last)
        return (
          <li key={net.id} className="flex items-center justify-between gap-3 py-2">
            <span className="min-w-0">
              <span className="block text-foreground">{net.label}</span>
              {last ? (
                <Link
                  href={manageQuotesHref({ quote: last.slug, section: 'cards', retry: last.ok ? null : net.id })}
                  className="block truncate text-xs text-muted-foreground hover:text-foreground"
                >
                  {last.slug} · {formatScheduleWhen(last.at)}
                </Link>
              ) : null}
            </span>
            {/* OAuth starts on an API route, so a plain <a>, not client navigation. */}
            <a href={(!net.ready && net.connectHref) || '/dashboard/integrations'} className="shrink-0">
              <Badge variant={variant}>{text}</Badge>
            </a>
          </li>
        )
      })}
    </ul>
  )
}
