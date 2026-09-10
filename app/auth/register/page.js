'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import AuthCard from '@/components/AuthCard'
import { authBtn, authError, authInput, authLink, authMuted } from '@/components/auth-ui'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Registration failed')
      setLoading(false)
      return
    }
    await signIn('credentials', { email, password, callbackUrl: '/dashboard' })
  }

  return (
    <AuthCard
      title="Create account"
      footer={
        <p className={`text-center ${authMuted}`}>
          Have an account?{' '}
          <Link href="/auth/signin" className={authLink}>
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {error ? <p className={authError}>{error}</p> : null}
        <input type="text" required placeholder="Name" className={authInput} value={name} onChange={(e) => setName(e.target.value)} />
        <input type="email" required placeholder="you@example.com" className={authInput} value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" required minLength={8} placeholder="Password (8+ chars)" className={authInput} value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" className={authBtn} disabled={loading}>
          {loading ? 'Creating…' : 'Sign up'}
        </button>
      </form>
    </AuthCard>
  )
}
