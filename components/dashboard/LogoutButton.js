'use client'

import { signOut } from 'next-auth/react'

export default function LogoutButton({ className = 'nav-link' }) {
  return (
    <button type="button" className={className} onClick={() => signOut({ callbackUrl: '/' })}>
      Log out
    </button>
  )
}
