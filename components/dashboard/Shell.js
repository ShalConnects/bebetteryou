import Link from 'next/link'
import { brand } from '@/config/site'
import BrandLogo from '@/components/site/BrandLogo'
import DashboardNav from './Nav'
import LogoutButton from './LogoutButton'

export default function DashboardShell({ isAdmin, children }) {
  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <header className="inset-x-page shrink-0 border-b border-line">
        <div className="shell-inner flex h-14 items-center justify-between md:h-16">
          <Link href="/" aria-label={brand.name}>
            <BrandLogo />
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="nav-link">
              View site
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="inset-x-page flex min-h-0 flex-1 flex-col py-8">
        <div className="shell-inner flex min-h-0 flex-1 flex-col gap-8 md:flex-row md:items-stretch md:gap-12">
          {isAdmin ? (
            <aside className="shrink-0 md:w-40">
              <p className="dash-label">Admin</p>
              <DashboardNav className="pt-4" />
            </aside>
          ) : null}
          <main className={isAdmin ? 'dash-main min-w-0' : 'min-w-0 flex-1'}>{children}</main>
        </div>
      </div>
    </div>
  )
}
