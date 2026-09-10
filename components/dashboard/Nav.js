'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { adminNav } from '@/config/dashboard'

export default function DashboardNav({ className = '' }) {
  const path = usePathname()
  return (
    <nav aria-label="Admin" className={`flex flex-wrap gap-x-6 gap-y-2 md:flex-col md:gap-1 ${className}`}>
      {adminNav.map(({ href, label, match }) => (
        <Link key={href} href={href} className={match(path) ? 'nav-link-active' : 'nav-link'}>
          {label}
        </Link>
      ))}
    </nav>
  )
}
