'use client'

import { SessionProvider } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import SiteShell from './site/SiteShell'
import { TraditionProvider } from './site/TraditionProvider'

const bare = ['/dashboard', '/auth']

function needsSession(path) {
  return bare.some((p) => path === p || path.startsWith(`${p}/`)) || path.startsWith('/pricing')
}

export default function LayoutClient({ children }) {
  const path = usePathname() || '/'
  const inner = needsSession(path) ? children : (
    <TraditionProvider>
      <SiteShell>{children}</SiteShell>
    </TraditionProvider>
  )
  return <SessionProvider>{inner}</SessionProvider>
}
