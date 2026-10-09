import Link from 'next/link'
import Chips, { moodLinks } from '@/components/preview/Chips'
import SectionHead from '@/components/preview/SectionHead'
import TableCard, { tiltAt } from '@/components/preview/TableCard'
import { Page, Pager } from '@/components/site/ui'
import { previewCopy as c, pv } from '@/config/preview'
import { quotesIntro } from '@/config/quotes'
import { listMoodIntents, pageQuotes, param, quoteTags, resolveSeed, resolveSort } from '@/libs/content'
import { quotesHref } from '@/libs/quotes-url'

export default async function PreviewQuotes({ searchParams }) {
  const sp = await searchParams
  const tag = param(sp?.tag)
  const sort = resolveSort(sp?.sort)
  const seed = resolveSeed(sort, sp?.seed)
  const [{ items, page, pages, total, pageSize }, tags, moods] = await Promise.all([
    pageQuotes(tag, param(sp?.page), sort, seed),
    quoteTags(),
    listMoodIntents(),
  ])
  const href = (opts) => pv(quotesHref(opts))

  return (
    <Page>
      <SectionHead as="h1" title={c.quotesTitle} sub={quotesIntro}>
        {/* No seed → the server rolls a fresh one, so each click reshuffles. */}
        <Link href={href({ tag, sort: 'random' })} className="nav-link text-accent">
          ↻ {c.shuffle}
        </Link>
      </SectionHead>
      <Chips label="Moods" className="mb-10" items={moodLinks(moods, tags, tag, (t) => href({ tag: t, sort, seed }))} />
      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-x-6">
        {items.map((q, i) => (
          <li key={q.slug}>
            <TableCard quote={q} href={pv(`/quotes/${q.slug}`)} tilt={tiltAt(i)} priority={i < 4} number />
          </li>
        ))}
      </ul>
      <Pager
        page={page}
        pages={pages}
        total={total}
        pageSize={pageSize}
        href={(p) => href({ tag, page: p, sort, seed })}
      />
    </Page>
  )
}
