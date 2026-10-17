'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { adminNav } from '@/config/dashboard'

export default function DashboardNav({ className = '' }) {
  const path = usePathname()
  const router = useRouter()
  const active = adminNav.find((item) => item.match(path)) || adminNav[0]

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
            className={item.match(path) ? 'nav-link-active' : 'nav-link'}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
