import Link from 'next/link'
import { FrameMock, PhoneMock } from '@/components/preview/Mockups'
import SectionHead from '@/components/site/SectionHead'
import { Page } from '@/components/site/ui'
import { printables as c, pv, themeCopy } from '@/config/preview'
import { themeLabel } from '@/config/themes'
import { listQuotes, param } from '@/libs/content'
import { allThemes } from '@/libs/theme-pages'

function Offer({ offer, children }) {
  return (
    <section className="mt-14">
      <SectionHead title={offer.title} sub={`${offer.price} · ${offer.note}`} />
      {children}
    </section>
  )
}

/** Proposal: printable wall art, wallpapers and guides. `?card=` puts one card first. */
export default async function PreviewPrintables({ searchParams }) {
  const card = param((await searchParams)?.card)
  const quotes = (await listQuotes()).sort((a, b) => (b.slug === card) - (a.slug === card) || b.n - a.n).slice(0, 4)

  return (
    <Page>
      <SectionHead as="h1" title={c.title} sub={c.sub} />
      <Offer offer={c.wall}>
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {quotes.map((q) => (
            <li key={q.slug}>
              <FrameMock quote={q} />
            </li>
          ))}
        </ul>
      </Offer>
      <Offer offer={c.phone}>
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {quotes.map((q) => (
            <li key={q.slug} className="mx-auto w-full max-w-[13rem]">
              <PhoneMock quote={q} />
            </li>
          ))}
        </ul>
      </Offer>
      <Offer offer={c.guide}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {allThemes.map((t) => (
            <li key={t}>
              <Link href={pv(`/guides/${t}`)} className="tile group block">
                <span className="block font-display text-xl text-paper">{c.guideDays} days of {themeLabel(t)}</span>
                <span className="mt-1 block text-sm text-quiet group-hover:text-accent">{themeCopy[t][0]} →</span>
              </Link>
            </li>
          ))}
        </ul>
      </Offer>
    </Page>
  )
}
