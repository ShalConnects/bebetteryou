import { Suspense } from 'react'
import UnsubscribeForm from '@/components/site/UnsubscribeForm'
import { PageIntro } from '@/components/site/ui'

export const metadata = { title: 'Email preferences' }

export default function UnsubscribePage() {
  return (
    <div className="page">
      <div className="shell-inner space-y-10">
        <PageIntro title="Email preferences">
          Choose what lands in your inbox — or leave the list.
        </PageIntro>
        <Suspense fallback={<p className="text-sm text-quiet">Loading…</p>}>
          <UnsubscribeForm />
        </Suspense>
      </div>
    </div>
  )
}
