'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import AuthCard from '@/components/AuthCard'

function VerifyInner() {
  const params = useSearchParams()
  const token = params.get('token')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!token) return
    signIn('magic-link', { token, callbackUrl: '/dashboard', redirect: true }).then((res) => {
      if (res?.error) setError('This link is invalid or has expired.')
    })
  }, [token])

  if (!token) {
    return (
      <AuthCard title="Check your email">
        <p className="text-center text-sm text-muted-foreground">
          A sign-in link has been sent to your email. Click it to finish signing in.
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={error ? 'Sign-in failed' : 'Signing you in…'}>
      <p className="text-center text-sm text-muted-foreground">
        {error || 'Please wait while we verify your magic link.'}
      </p>
    </AuthCard>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<AuthCard title="Loading…" />}>
      <VerifyInner />
    </Suspense>
  )
}
