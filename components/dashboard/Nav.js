'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChartColumn, Layers, LayoutDashboard, Settings, ShoppingBag, Users } from 'lucide-react'
import { adminNav } from '@/config/dashboard'
import LinkPending from './LinkPending'
import { cn } from '@/libs/cn'

const icons = {
  today: LayoutDashboard,
  content: Layers,
  audience: Users,
  shop: ShoppingBag,
  insights: ChartColumn,
  settings: Settings,
}

/** `side` = desktop sidebar; `bar` = phone bottom bar. Same items, same active rule. */
export default function DashboardNav({ variant = 'side' }) {
  const path = usePathname()
  const bar = variant === 'bar'

  return (
    <nav
      aria-label="Admin"
      className={
        bar
          ? 'fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden'
          : 'flex flex-col gap-1'
      }
    >
      {adminNav.map(({ href, label, icon, match }) => {
        const Icon = icons[icon]
        const on = match(path)
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? 'page' : undefined}
            className={cn(
              'flex items-center text-muted-foreground transition-colors hover:text-foreground',
              bar ? 'flex-col gap-1 py-2 text-xs' : 'gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted',
              on && (bar ? 'text-primary' : 'bg-muted text-foreground')
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {label}
            {bar ? null : <LinkPending />}
          </Link>
        )
      })}
    </nav>
  )
}
