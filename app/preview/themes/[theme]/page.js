import Link from 'next/link'
import { notFound } from 'next/navigation'
import Chips from '@/components/preview/Chips'
import NewsletterForm from '@/components/site/NewsletterForm'
import SectionHead from '@/components/site/SectionHead'
import TableCard, { tiltAt } from '@/components/site/TableCard'
import { Page } from '@/components/site/ui'
import { printables as c, pv, themeCopy } from '@/config/preview'
import { themeLabel } from '@/config/themes'
import { allThemes, passageTraditions, themeContext } from '@/libs/theme-pages'

/** Proposal: one search-friendly landing page per theme ("quotes about courage"). */
export default async function PreviewTheme({ params }) {
  const { theme } = await params
  if (!allThemes.includes(theme)) notFound()
  const { cards, passages } = await themeContext(theme)
  const label = themeLabel(theme)

  return (
    <Page>
      <SectionHead as="h1" title={`Quotes about ${label.toLowerCase()}`} sub={themeCopy[theme][0]} />
      <Chips
        label="Themes"
        className="mb-10"
        items={allThemes.map((t) => ({ key: t, label: themeLabel(t), href: pv(`/themes/${t}`), active: t === theme }))}
      />
      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-x-6">
        {cards.slice(0, 12).map((q, i) => (
          <li key={q.slug}>
            <TableCard quote={q} href={pv(`/quotes/${q.slug}`)} tilt={tiltAt(i)} number />
          </li>
        ))}
      </ul>

      <section className="mt-16">
        <SectionHead title={`${label} in every tradition`} />
        <ul className="grid gap-4 md:grid-cols-2">
          {passageTraditions.map((t) => {
            const [p] = passages(t.id)
            return p ? (
              <li key={t.id} className="tile">
                <p className="kicker">{t.label}</p>
                <p className="mt-2 text-body/90">“{p.text}”</p>
                <p className="mt-2 text-sm text-quiet">— {p.ref}</p>
              </li>
            ) : null
          })}
        </ul>
      </section>

      <section className="mt-16 grid gap-4 md:grid-cols-2">
        <Link href={pv(`/guides/${theme}`)} className="tile group">
          <span className="block font-display text-2xl text-paper">{c.guideDays} days of {label}</span>
          <span className="mt-1 block text-sm text-quiet group-hover:text-accent">
            {c.guide.title} · {c.guide.price} →
          </span>
        </Link>
        <Link href={pv('/printables')} className="tile group">
          <span className="block font-display text-2xl text-paper">Put it on your wall</span>
          <span className="mt-1 block text-sm text-quiet group-hover:text-accent">
            {c.wall.title} {c.wall.price} · {c.phone.title} {c.phone.price} →
          </span>
        </Link>
      </section>

      <section className="tile mt-16">
        <h2 className="heading-sm">{c.signupTitle}</h2>
        <NewsletterForm compact />
      </section>
    </Page>
  )
}
