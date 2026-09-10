import Link from 'next/link'
import { Page } from '@/components/site/ui'

export default function NotFound() {
  return (
    <Page className="items-center text-center">
      <p className="font-display text-5xl text-paper">404</p>
      <p className="mt-4 text-body/80">Nothing here.</p>
      <Link href="/" className="btn mt-10">
        Home
      </Link>
    </Page>
  )
}
