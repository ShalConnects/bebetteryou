import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { tabItem, tabList } from '@/components/ui/tabs'
import { cn } from '@/libs/cn'
import LinkPending from './LinkPending'

/** Every admin page: title, optional actions and tabs, then its body. */
export function DashPage({ title, description, actions, tabs, active, children }) {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl tracking-wide text-foreground md:text-3xl">{title}</h1>
          {description ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </header>
      {tabs ? <PageTabs tabs={tabs} active={active} /> : null}
      {children}
    </div>
  )
}

/** Link tabs — the server renders only the active tab, so each tab loads only its own data. */
export function PageTabs({ tabs, active }) {
  return (
    <nav aria-label="Sections" className="-mx-1 overflow-x-auto">
      <div className={tabList}>
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            aria-current={t.id === active ? 'page' : undefined}
            className={tabItem(t.id === active)}
          >
            {t.label}
            <LinkPending />
          </Link>
        ))}
      </div>
    </nav>
  )
}

export function DashPanel({ title, description, action, children, className, contentClassName }) {
  return (
    <Card className={className}>
      {title || description ? (
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            {title ? <CardTitle>{title}</CardTitle> : null}
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {action}
        </CardHeader>
      ) : null}
      <CardContent className={cn('space-y-4', contentClassName)}>{children}</CardContent>
    </Card>
  )
}

export function Stat({ label, value, hint }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  )
}
