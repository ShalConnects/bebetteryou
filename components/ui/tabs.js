import { cn } from '@/libs/cn'

/** Segmented-control look shared by link tabs (pages) and button tabs (in-panel filters). */
export const tabList = 'inline-flex gap-1 rounded-lg bg-muted p-1'

export const tabItem = (on) =>
  cn(
    'whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground',
    on && 'bg-card text-foreground shadow-sm'
  )
