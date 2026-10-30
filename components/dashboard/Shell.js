import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { brand } from '@/config/site'
import BrandLogo from '@/components/site/BrandLogo'
import DashboardNav from './Nav'
import LogoutButton from './LogoutButton'
import { ToastHost } from './toast'

const quietLink = 'flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground'

export default function DashboardShell({ isAdmin, children }) {
  return (
    <div className="dash flex h-dvh overflow-hidden">
      {isAdmin ? (
        <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r border-border bg-card/50 p-4 md:flex">
          <Link href="/" aria-label={brand.name} className="px-3 pt-2">
            <BrandLogo />
          </Link>
          <DashboardNav />
          <div className="mt-auto space-y-3 border-t border-border px-3 pt-4">
            <Link href="/" className={quietLink}>
              <ExternalLink className="size-4" aria-hidden /> View site
            </Link>
            <LogoutButton className={quietLink} />
          </div>
        </aside>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={`flex h-14 shrink-0 items-center justify-between border-b border-border px-4 pt-[env(safe-area-inset-top)] ${isAdmin ? 'md:hidden' : ''}`}
        >
          <Link href="/" aria-label={brand.name}>
            <BrandLogo />
          </Link>
          <LogoutButton className={quietLink} />
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className={`mx-auto w-full max-w-6xl p-4 md:p-8 ${isAdmin ? 'pb-24' : ''}`}>{children}</div>
        </main>
      </div>
      {isAdmin ? <DashboardNav variant="bar" /> : null}
      <ToastHost />
    </div>
  )
}
