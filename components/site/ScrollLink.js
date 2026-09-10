'use client'

import Link from 'next/link'

/** Same-route nav (e.g. quote paging) — scroll top without useEffect. */
export default function ScrollLink({ href, className, children, ...props }) {
  return (
    <Link href={href} className={className} onClick={() => window.scrollTo(0, 0)} {...props}>
      {children}
    </Link>
  )
}
