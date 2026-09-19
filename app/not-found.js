import Link from 'next/link'
import QuoteCard from '@/components/site/QuoteCard'
import { Page, TextLink } from '@/components/site/ui'
import { copy } from '@/config/site'
import { listQuotes } from '@/libs/content'
import { sample } from '@/libs/sample'

/** Fresh deal each visit / refresh. */
export const dynamic = 'force-dynamic'

export default async function NotFound() {
  const pool = await listQuotes()
  const quote = sample(pool, 1)[0]

  return (
    <section className="hero relative flex flex-1 flex-col overflow-x-clip">
      <Page className="relative z-10 items-center justify-center py-12 md:min-h-[calc(100dvh-10rem)] md:py-20">
        <div className="grid w-full max-w-3xl items-center gap-10 md:grid-cols-2 md:gap-12">
          <div className="hero-rise text-left">
            <p
              className="font-display text-[5.5rem] leading-none tracking-tight text-accent/25 md:text-[7rem] lg:text-[8rem]"
              aria-hidden
            >
              404
            </p>
            <h1 className="mt-2 font-display text-3xl tracking-wide text-paper md:text-4xl">
              <span className="sr-only">404 — </span>
              {copy.notFoundTitle}
            </h1>
            <p className="lede mt-3 max-w-sm">{copy.notFoundSub}</p>
            <div className="mt-8 flex flex-wrap items-center justify-start gap-x-6 gap-y-3">
              <Link href="/" className="btn bg-accent text-accent-ink hover:bg-accent/90">
                Home
              </Link>
              <TextLink href="/quotes">Browse quotes</TextLink>
            </div>
          </div>

          {quote ? (
            <div className="hero-rise-delay w-full max-w-[18rem] sm:max-w-sm">
              <div className="shadow-[0_20px_48px_rgba(0,0,0,0.45)]">
                <QuoteCard quote={quote} priority />
              </div>
            </div>
          ) : null}
        </div>
      </Page>
    </section>
  )
}
