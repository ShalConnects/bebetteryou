import Link from 'next/link'
import { copy } from '@/config/site'
import SectionHead from './SectionHead'
import TableCard, { tiltAt } from './TableCard'

/** Sideways row of cards. Defaults suit the homepage; pages pass their own title and links. */
export default function DeckStrip({
  items,
  title = copy.homeDeckTitle,
  allHref = '/quotes',
  hrefFor = (q) => `/quotes/${q.slug}`,
}) {
  if (!items.length) return null
  return (
    <section className="border-t border-line">
      <div className="pb-12 pt-16 md:pb-16 md:pt-24">
        <div className="inset-x-page">
          <div className="shell-inner">
            <SectionHead title={title}>
              <Link href={allHref} className="nav-link text-accent">
                {copy.homeDeckAll} →
              </Link>
            </SectionHead>
          </div>
        </div>
        <ul className="strip">
          {items.map((q, i) => (
            <li key={q.slug} className="strip-item">
              <TableCard quote={q} href={hrefFor(q)} tilt={tiltAt(i)} number />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
