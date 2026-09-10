import { resolvePrintLook } from '@/config/print-styles'
import { getQuote } from '@/libs/content'
import { printFileName, savePrintFileOnce } from '@/libs/print-assets'
import { renderPrintFile } from '@/libs/print-design.mjs'
import { customPrintSlug } from '@/libs/print-link'
import { clampQuoteInput, isPrintableQuote } from '@/libs/quote-text'
import { getSiteUrl } from '@/libs/site-url'

/**
 * The store's authority on what may be printed. Routes and pages both go
 * through it, so a text-less quote cannot reach the renderer by a url someone
 * typed by hand — the ui hiding the link is a courtesy, not the guard.
 *
 * `own` is not a catalog entry: copy is taken from the request, and only then.
 * A real slug still ignores request text so a typed-in body cannot replace a
 * stored quote.
 */
export async function getPrintableQuote(slug) {
  const quote = await getQuote(slug)
  return quote && isPrintableQuote(quote) ? quote : null
}

export async function resolvePrintableQuote({ slug, text, author } = {}) {
  if (slug === customPrintSlug) {
    const quote = {
      slug,
      n: 0,
      text: clampQuoteInput(text),
      author: String(author || '').trim().slice(0, 80),
    }
    return isPrintableQuote(quote) ? quote : null
  }
  return getPrintableQuote(slug)
}

/**
 * Render-and-store for a selection, shared by the design, quote and checkout
 * routes so the artwork for a given quote, product, colour and type look is
 * produced once and addressed the same way everywhere.
 *
 * Type overlays arrive as raw ids and are resolved here — the only place they
 * are — so an unknown value degrades to the default instead of reaching the
 * renderer. They compose through one mechanism rather than needing a path each.
 *
 * Placement is absent on purpose: the tee's front and back print areas are the
 * same 3:4 shape, so both wear the identical file and only the preview and the
 * order payload care which side it goes on.
 */
export async function printFileForSelection({ quote, selection, style, leading, scale, credit }) {
  const { product, color, print } = selection
  const look = resolvePrintLook({ style, leading, scale, credit })
  const filename = printFileName({
    slug: quote.slug,
    productId: product.id,
    color: color.id,
    print,
    style: look.id,
    body: quote.slug === customPrintSlug ? `${quote.text}\0${quote.author || ''}` : '',
  })

  return savePrintFileOnce(filename, () =>
    renderPrintFile({
      text: quote.text,
      author: look.credit.id === 'on' ? quote.author : '',
      ink: color.ink,
      ...print,
      style: look.style,
    })
  )
}

/**
 * Printful fetches print files itself, both to price an order and later to
 * produce it, so anything handed over must be absolute and publicly reachable.
 * Blob storage already returns absolute urls; local disk returns a site path.
 *
 * Note this means print pricing cannot work against localhost — Printful has to
 * be able to reach the host named by SITE_URL.
 */
export function absolutePrintUrl(url) {
  return url?.startsWith('/') ? `${getSiteUrl()}${url}` : url
}
