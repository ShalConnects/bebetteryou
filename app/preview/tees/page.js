import ProductMock from '@/components/preview/ProductMock'
import SectionHead from '@/components/preview/SectionHead'
import { Page } from '@/components/site/ui'
import { previewCopy as c, teeLooks } from '@/config/preview'
import { listQuotes } from '@/libs/content'
import { isPrintableQuote } from '@/libs/quote-text'

/** Design proposals as mockups — nothing here touches the print renderer. */
export default async function PreviewTees() {
  const quote = (await listQuotes()).filter(isPrintableQuote).sort((a, b) => b.n - a.n)[0]
  if (!quote) return null
  const rows = [
    ...teeLooks.map((look) => ({
      ...look,
      shots: ['black', 'white'].map((colorId) => ({ colorId })),
    })),
    {
      id: 'mug',
      label: 'Mug, both sides',
      note: 'Quote on the front; mark and card number on the back.',
      shots: [
        { productId: 'mug', colorId: 'black' },
        { productId: 'mug', colorId: 'black', back: true },
      ],
    },
  ]

  return (
    <Page>
      <SectionHead as="h1" title={c.teesTitle} sub={c.teesSub} />
      <div className="space-y-16">
        {rows.map(({ id, label, note, shots, ...look }) => (
          <section key={id} className="grid items-center gap-6 md:grid-cols-[14rem_1fr] md:gap-10">
            <div>
              <h2 className="heading-sm">{label}</h2>
              <p className="mt-2 text-sm text-body/75">{note}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 md:gap-6">
              {shots.map((shot, i) => (
                <ProductMock key={i} quote={quote} look={look} {...shot} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </Page>
  )
}
