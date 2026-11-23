'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/dashboard/toast'
import { plural } from '@/libs/dashboard-ops'

/** Puts saved drafts on the empty card days (Mon, Wed, Thu, Sat) of the next two weeks. */
export default function FillSchedule() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function fill() {
    setBusy(true)
    try {
      const res = await fetch('/api/social/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fill: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fill failed')
      const left = data.emptyLeft ? ` — ${plural(data.emptyLeft, 'day')} still empty, add cards` : ''
      toast(`Scheduled ${plural(data.created.length, 'card')}${left}`)
      router.refresh()
    } catch (err) {
      toast(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button size="sm" variant="outline" disabled={busy} onClick={fill}>
      {busy ? 'Filling…' : 'Fill next 2 weeks'}
    </Button>
  )
}
