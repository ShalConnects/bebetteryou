import Link from 'next/link'
import { notFound } from 'next/navigation'
import Chips from '@/components/preview/Chips'
import SectionHead from '@/components/site/SectionHead'
import TableCard from '@/components/site/TableCard'
import { Page } from '@/components/site/ui'
import { printables as c, pv, themeCopy } from '@/config/preview'
import { themeLabel } from '@/config/themes'
import { param } from '@/libs/content'
import { allThemes, passageTraditions, themeContext } from '@/libs/theme-pages'

/** Proposal: a short guide — each day is a card, a passage from the reader's tradition, a question and one action. */
export default async function PreviewGuide({ params, searchParams }) {
  const { theme } = await params
  if (!allThemes.includes(theme)) notFound()
  const pick = param((await searchParams)?.t)
  const tradition = passageTraditions.find((t) => t.id === pick) || passageTraditions[0]
  const { cards, passages } = await themeContext(theme)
  const [intro, question, action] = themeCopy[theme]
  const days = passages(tradition.id).slice(0, c.guideDays)

  return (
    <Page narrow>
      <SectionHead
        as="h1"
        title={`${days.length} days of ${themeLabel(theme)}`}
        sub={`${intro} ${tradition.label} edition · ${c.guide.price}`}
      />
      <Chips
        label="Tradition"
        className="mb-10"
        items={passageTraditions.map((t) => ({
          key: t.id,
          label: t.label,
          href: pv(`/guides/${theme}?t=${t.id}`),
          active: t.id === tradition.id,
        }))}
      />
      <ol className="space-y-12">
        {days.map((p, i) => (
          <li key={p.ref} className="grid gap-6 sm:grid-cols-[10rem_1fr]">
            {cards[i] ? <TableCard quote={cards[i]} /> : <span />}
            <div>
              <p className="kicker">Day {i + 1}</p>
              <blockquote className="mt-3 text-lg text-paper">
                “{p.text}”<footer className="mt-2 text-sm text-quiet">— {p.ref}{p.translation ? ` (${p.translation})` : ''}</footer>
              </blockquote>
              <p className="mt-5 text-body/85">{question}</p>
              <p className="mt-2 text-sm text-quiet">Today: {action}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="tile mt-12 text-sm text-quiet">{c.guideNote}</p>
      <Link href={pv(`/themes/${theme}`)} className="nav-link mt-6 inline-block">
        ← {themeLabel(theme)} page
      </Link>
    </Page>
  )
}
