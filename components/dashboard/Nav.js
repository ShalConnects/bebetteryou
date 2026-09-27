'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { adminNav } from '@/config/dashboard'

function isActive(item, path, searchParams) {
  if (item.analytics) return Boolean(searchParams?.get('range'))
  if (item.href === '/dashboard') return path === '/dashboard' && !searchParams?.get('range')
  return item.match(path)
}

export default function DashboardNav({ className = '' }) {
  const path = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const active = adminNav.find((item) => isActive(item, path, searchParams)) || adminNav[0]

  return (
    <div className={className}>
      <label className="mb-3 block md:hidden">
        <span className="sr-only">Admin section</span>
        <select
          className="dash-select w-full"
          value={active.href}
          onChange={(e) => router.push(e.target.value)}
        >
          {adminNav.map(({ href, label }) => (
            <option key={href} value={href}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <nav aria-label="Admin" className="hidden flex-wrap gap-x-6 gap-y-2 md:flex md:flex-col md:gap-1">
        {adminNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isActive(item, path, searchParams) ? 'nav-link-active' : 'nav-link'}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
