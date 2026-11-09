'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/libs/cn'

const COOKIE = 'dash_profile'

function setProfile(id) {
  try {
    document.cookie = `${COOKIE}=${id};path=/;max-age=31536000;samesite=lax`
  } catch {
    /* ignore */
  }
}

/** BeBetterYou ↔ ShalConnects profile switch. Same admin login; separate mail stacks. */
export default function ProfileSwitcher() {
  const path = usePathname()
  const shal = path.startsWith('/dashboard/outreach')

  return (
    <div
      className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1"
      role="group"
      aria-label="Dashboard profile"
    >
      <Link
        href="/dashboard"
        onClick={() => setProfile('bebetteryou')}
        className={cn(
          'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
          !shal ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        BeBetterYou
      </Link>
      <Link
        href="/dashboard/outreach"
        onClick={() => setProfile('shalconnects')}
        className={cn(
          'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
          shal ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        ShalConnects
      </Link>
    </div>
  )
}
