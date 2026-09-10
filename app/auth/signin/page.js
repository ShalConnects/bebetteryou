'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import AuthCard from '@/components/AuthCard'
import { authBtn, authError, authInput, authLink, authMuted, authOutline, authTab } from '@/components/auth-ui'

export default function SignInPage() {
  const [mode, setMode] = useState('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)

  async function handleMagic(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send magic link')
      }
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCredentials(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await signIn('credentials', {
      email,
      password,
      callbackUrl: '/dashboard',
      redirect: false,
    })
    setLoading(false)
    if (res?.error) setError('Invalid email or password.')
    else if (res?.url) window.location.href = res.url
  }

  if (sent) {
    return (
      <AuthCard title="Check your email">
        <p className={`text-center ${authMuted}`}>
          We sent a magic link to <strong className="text-paper">{email}</strong>. Click it to sign in.
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Sign in"
      footer={
        <p className={`text-center ${authMuted}`}>
          No account?{' '}
          <Link href="/auth/register" className={authLink}>
            Sign up
          </Link>
        </p>
      }
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        {process.env.NEXT_PUBLIC_GOOGLE_ENABLED !== 'false' && (
          <button type="button" className={authOutline} onClick={() => signIn('google', { callbackUrl: '/dashboard' })}>
            Google
          </button>
        )}
        {process.env.NEXT_PUBLIC_GITHUB_ENABLED === 'true' && (
          <button type="button" className={authOutline} onClick={() => signIn('github', { callbackUrl: '/dashboard' })}>
            GitHub
          </button>
        )}
      </div>

      <div className="flex overflow-hidden border border-line text-sm">
        {['magic', 'credentials'].map((m) => (
          <button key={m} type="button" className={authTab(mode === m)} onClick={() => setMode(m)}>
            {m === 'magic' ? 'Magic link' : 'Password'}
          </button>
        ))}
      </div>

      {mode === 'magic' ? (
        <form onSubmit={handleMagic} className="space-y-3">
          {error ? <p className={authError}>{error}</p> : null}
          <input type="email" required placeholder="you@example.com" className={authInput} value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" className={authBtn} disabled={loading}>
            {loading ? 'Signing in…' : 'Continue'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleCredentials} className="space-y-3">
          {error ? <p className={authError}>{error}</p> : null}
          <input type="email" required placeholder="you@example.com" className={authInput} value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" required placeholder="Password" className={authInput} value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="submit" className={authBtn} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      )}
    </AuthCard>
  )
}
