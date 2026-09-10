'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import AuthCard from '@/components/AuthCard'

const MESSAGES = {
  Configuration: 'There is a server configuration problem.',
  AccessDenied: 'Access denied.',
  Verification: 'The sign-in link may have expired or already been used.',
  Default: 'An error occurred during sign-in.',
}

function ErrorInner() {
  const params = useSearchParams()
  const code = params.get('error') || 'Default'
  const message = MESSAGES[code] || MESSAGES.Default

  return (
    <AuthCard title="Sign-in error">
      <p className="text-center text-sm text-muted-foreground">{message}</p>
      <Link
        href="/auth/signin"
        className="block text-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
      >
        Try again
      </Link>
    </AuthCard>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<AuthCard title="Sign-in error" />}>
      <ErrorInner />
    </Suspense>
  )
}
