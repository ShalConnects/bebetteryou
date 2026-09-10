/**
 * @jest-environment node
 */
import { lineSubtotal, printProducts, publicPrintProducts, resolveSelection } from '@/config/print-products'
import {
  creditForAuthor,
  defaultPrintCredit,
  defaultPrintLeading,
  defaultPrintScale,
  defaultPrintStyle,
  printCredits,
  printLeadings,
  printScales,
  printStyles,
  resolvePrintCredit,
  resolvePrintLeading,
  resolvePrintLook,
  resolvePrintScale,
  resolvePrintStyle,
} from '@/config/print-styles'
import { quoteCard } from '@/config/quote-card'
import quotes from '@/data/quotes.json'
import { fontFiles } from '@/libs/canvas-text.mjs'
import { existingAssetUrl } from '@/libs/asset-store'
import { printFileName } from '@/libs/print-assets'
import { resolvePrintableQuote } from '@/libs/print-file'
import { measurePrintFile, renderPrintFile } from '@/libs/print-design.mjs'
import { clampPrintQty, customPrintSlug, parsePrintParams, PRINT_QTY_MAX, printHref, printQuoteHref, printQuantities, printShipHref } from '@/libs/print-link'
import { catalogHref, shopHref } from '@/libs/quotes-url'
import { formatPrice, formatPrintOrderDate, formatPrintOrderItem, formatPrintSelection, formatPrintShipTo, formatStatus, inkBlendMode, presentPrintOrder, printOrderFlags, printPreviewSrc } from '@/libs/print-format'
import { cylinderU } from '@/libs/print-preview'
import { mongoUri } from '@/libs/mongo'
import { newOrderNumber, printOrdersReady } from '@/libs/print-orders'
import {
  canTransition,
  isHandedOff,
  printOrderFlow,
  printOrderStatuses,
  sourcesOf,
} from '@/libs/print-status'
import { printfulOrderPayload } from '@/libs/printful'
import { isPrintableQuote } from '@/libs/quote-text'
import { frameFrom, pickColour, pickTemplate } from '@/libs/printful-catalog'

describe('print product catalog', () => {
  it('resolves a valid product, colour and size', () => {
    const selection = resolveSelection({ productId: 'tee', color: 'white', size: 'M' })
    expect(selection.product.id).toBe('tee')
    expect(selection.color.ink).toBeTruthy()
    expect(selection.retail).toBe(2800)
    expect(selection.variantId).toBe(4012)
  })

  it('resolves ink without a size for the design step', () => {
    const selection = resolveSelection({ productId: 'mug', color: 'black' })
    expect(selection.size).toBeNull()
    expect(selection.variantId).toBeNull()
  })

  it('rejects unknown product, colour or size', () => {
    expect(resolveSelection({ productId: 'hat', color: 'white', size: 'M' })).toBeNull()
    expect(resolveSelection({ productId: 'tee', color: 'teal', size: 'M' })).toBeNull()
    expect(resolveSelection({ productId: 'tee', color: 'white', size: 'XS' })).toBeNull()
  })

  it('maps every colour and size to a real printful variant', () => {
    for (const product of printProducts) {
      for (const color of product.colors) {
        for (const size of product.sizes) {
          const { variantId } = resolveSelection({ productId: product.id, color: color.id, size })
          expect(variantId).toBeGreaterThan(0)
        }
      }
    }
  })

  it('gives the 15 oz mug its own print shape but keeps one file per tee', () => {
    const eleven = resolveSelection({ productId: 'mug', color: 'white', size: '11 oz' })
    const fifteen = resolveSelection({ productId: 'mug', color: 'white', size: '15 oz' })
    expect(fifteen.print).not.toEqual(eleven.print)

    const small = resolveSelection({ productId: 'tee', color: 'white', size: 'S' })
    const large = resolveSelection({ productId: 'tee', color: 'white', size: '2XL' })
    expect(large.print).toEqual(small.print)
  })

  it('never exposes variant ids to the client', () => {
    expect(printProducts.every((p) => p.variants)).toBe(true)
    expect(publicPrintProducts.every((p) => p.variants === undefined)).toBe(true)
  })

  it('multiplies cents without float drift', () => {
    expect(lineSubtotal(2800, 3)).toBe(8400)
    expect(lineSubtotal(1600, 1)).toBe(1600)
  })

  it('gives every colour a bundled blank and a catalog id to upgrade from', () => {
    for (const product of printProducts) {
      for (const color of product.colors) {
        // Printful sells some colours as their own product, so the id can sit either side.
        expect(color.catalogId || product.catalogId).toBeGreaterThan(0)
        expect(color.mockup).toMatch(/^\/print-products\/[\w-]+\.png$/)
      }
    }
  })

  it('keeps every print box inside its blank', () => {
    for (const product of printProducts) {
      for (const { frame } of product.placements) {
        expect(frame.left + frame.width).toBeLessThanOrEqual(100)
        expect(frame.top + frame.height).toBeLessThanOrEqual(100)
      }
    }
  })

  it('gives every product at least one placement, with unique ids', () => {
    for (const product of printProducts) {
      const ids = product.placements.map((p) => p.id)
      expect(ids.length).toBeGreaterThan(0)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('defaults placement to the first and rejects one the product lacks', () => {
    expect(resolveSelection({ productId: 'tee', color: 'white', size: 'M' }).placement.id).toBe(
      'front'
    )
    expect(
      resolveSelection({ productId: 'tee', color: 'white', size: 'M', placement: 'back' }).placement
        .id
    ).toBe('back')
    // A mug has no back, so asking for one is not a silent fallback.
    expect(
      resolveSelection({ productId: 'mug', color: 'white', size: '11 oz', placement: 'back' })
    ).toBeNull()
  })

  it('prints the same file on either side of a tee, the areas being one shape', () => {
    const front = resolveSelection({ productId: 'tee', color: 'white', size: 'M' })
    const back = resolveSelection({
      productId: 'tee',
      color: 'white',
      size: 'M',
      placement: 'back',
    })
    expect(back.print).toEqual(front.print)
  })
})

describe('design to shipping hand-off', () => {
  const selection = {
    productId: 'mug',
    color: 'black',
    size: '15 oz',
    placement: 'default',
    style: 'bold',
    leading: 'loose',
    scale: 'large',
    credit: 'off',
    quantity: 3,
  }

  it('points the shop card at the designer', () => {
    expect(printHref('bby-1')).toBe('/print/bby-1')
    expect(printHref('bby-1', { productId: 'mug' })).toBe('/print/bby-1?product=mug')
  })

  it('round-trips a selection through the url', () => {
    const href = printShipHref('bby-1', selection)
    expect(href.startsWith('/print/bby-1/ship?')).toBe(true)
    const parsed = parsePrintParams(
      Object.fromEntries(new URLSearchParams(href.split('?')[1]))
    )
    expect(parsed).toEqual(selection)
  })

  it('escapes values that would otherwise break the query', () => {
    const href = printShipHref('bby-1', { ...selection, size: '15 oz' })
    expect(href).toContain('size=15+oz')
    const parsed = parsePrintParams(Object.fromEntries(new URLSearchParams(href.split('?')[1])))
    expect(parsed.size).toBe('15 oz')
  })

  it('clamps quantity and defaults it, so a tampered url cannot bulk order', () => {
    expect(printQuantities).toHaveLength(PRINT_QTY_MAX)
    expect(printQuantities[0]).toBe(1)
    expect(printQuantities.at(-1)).toBe(PRINT_QTY_MAX)
    expect(parsePrintParams({ qty: '999' }).quantity).toBe(PRINT_QTY_MAX)
    expect(parsePrintParams({ qty: '0' }).quantity).toBe(1)
    expect(parsePrintParams({ qty: '-5' }).quantity).toBe(1)
    expect(parsePrintParams({ qty: 'abc' }).quantity).toBe(1)
    expect(parsePrintParams({}).quantity).toBe(1)
  })

  it('leaves an incomplete url for the catalog to reject', () => {
    expect(resolveSelection(parsePrintParams({ qty: '1' }))).toBeNull()
    expect(resolveSelection(parsePrintParams({ product: 'tee' }))).toBeNull()
  })

  it('carries own copy in the query and keeps it off catalog urls', () => {
    expect(
      printHref(customPrintSlug, { productId: 'tee', text: 'Hold the line.', author: 'Ada' })
    ).toBe('/print/own?text=Hold+the+line.&author=Ada&product=tee')
    expect(printHref('bby-1', { productId: 'tee', text: 'Hold the line.', author: 'Ada' })).toBe(
      '/print/bby-1?product=tee'
    )
    const href = printShipHref(customPrintSlug, { ...selection, text: 'Hold the line.', author: 'Ada' })
    expect(parsePrintParams(Object.fromEntries(new URLSearchParams(href.split('?')[1])))).toEqual({
      ...selection,
      text: 'Hold the line.',
      author: 'Ada',
    })
    expect(printQuoteHref('bby-1')).toBe('/quotes/bby-1')
    expect(printQuoteHref(customPrintSlug)).toBeNull()
    expect(shopHref({ tag: 'Growth', sort: 'oldest' })).toBe('/shop?tag=Growth&sort=oldest')
    expect(catalogHref('/quotes', { tag: 'Growth', sort: 'oldest' })).toBe(
      '/quotes?tag=Growth&sort=oldest'
    )
  })
})

describe('print type styles', () => {
  it('resolves every preset by id', () => {
    for (const style of printStyles) {
      expect(resolvePrintStyle(style.id)).toBe(style)
    }
  })

  it('falls back to the default rather than throwing on junk', () => {
    for (const id of ['', null, undefined, 'nope', '../../etc/passwd']) {
      expect(resolvePrintStyle(id)).toBe(defaultPrintStyle)
    }
  })

  it('names a registered font for each preset', () => {
    const fonts = new Set(Object.keys(fontFiles))
    for (const style of printStyles) {
      expect(fonts.has(style.font)).toBe(true)
    }
    // Distinct faces, or the presets would be indistinguishable on the product.
    expect(new Set(printStyles.map((s) => s.font)).size).toBe(printStyles.length)
  })

  it('resolves every leading and falls back on junk', () => {
    for (const lead of printLeadings) expect(resolvePrintLeading(lead.id)).toBe(lead)
    for (const id of ['', null, undefined, 'nope', '2.0']) {
      expect(resolvePrintLeading(id)).toBe(defaultPrintLeading)
    }
  })

  it('orders leadings apart and inside a range the renderer can fit', () => {
    const values = printLeadings.map((lead) => lead.lineHeight)
    expect(values).toEqual([...values].sort((a, b) => a - b))
    expect(new Set(values).size).toBe(values.length)
    // Below 1 lines collide; far above 1.5 the fitted type gets too small to read.
    expect(Math.min(...values)).toBeGreaterThanOrEqual(1)
    expect(Math.max(...values)).toBeLessThanOrEqual(1.6)
  })

  it('resolves every scale and falls back on junk', () => {
    for (const scale of printScales) expect(resolvePrintScale(scale.id)).toBe(scale)
    for (const id of ['', null, undefined, 'nope', '99']) {
      expect(resolvePrintScale(id)).toBe(defaultPrintScale)
    }
  })

  it('orders scales apart and keeps the credit at half the quote', () => {
    const values = printScales.map((scale) => scale.sizeRatio)
    expect(values).toEqual([...values].sort((a, b) => a - b))
    expect(new Set(values).size).toBe(values.length)
    for (const scale of printScales) {
      expect(scale.metaRatio / scale.sizeRatio).toBeCloseTo(0.5)
    }
  })

  it('composes type, spacing, scale and credit into one look', () => {
    const look = resolvePrintLook({ style: 'bold', leading: 'loose', scale: 'small', credit: 'off' })
    expect(look.id).toBe('bold:loose:small:off')
    expect(look.style.font).toBe('Bungee')
    expect(look.style.lineHeight).toBe(1.5)
    expect(look.style.sizeRatio).toBe(0.14)
    expect(look.credit.id).toBe('off')
  })

  it('keeps credit on for a named author and off for Unknown', () => {
    expect(creditForAuthor('Maya Angelou').id).toBe('on')
    expect(creditForAuthor('Unknown').id).toBe('off')
    expect(creditForAuthor('  unknown  ').id).toBe('off')
    expect(creditForAuthor('').id).toBe('off')
  })

  it('resolves credit and falls back to on, so older urls keep the byline', () => {
    expect(resolvePrintCredit('off')).toBe(printCredits[1])
    expect(resolvePrintCredit(undefined)).toBe(defaultPrintCredit)
  })
})

/**
 * Printful asks for 300dpi print files and warns that fine detail below roughly
 * a fifth of an inch closes up in DTG and sublimation. Leading is the one
 * control that can push type down — looser spacing means a taller block, and the
 * renderer answers by fitting smaller — so the guarantee is checked here against
 * the real catalogue rather than assumed.
 */
describe('printable quotes', () => {
  it('accepts a quote with text and refuses one without', () => {
    expect(isPrintableQuote({ text: 'Keep going.' })).toBe(true)
    for (const quote of [{}, null, undefined, { text: '' }, { text: '   ' }, { text: '\n\n' }]) {
      expect(isPrintableQuote(quote)).toBe(false)
    }
  })

  it('refuses the scanned cards, which is most of the store', () => {
    // Text lives in the JPEG for these, so there is nothing to typeset.
    const scans = quotes.filter((quote) => !quote.text)
    expect(scans.length).toBeGreaterThan(0)
    for (const quote of scans) expect(isPrintableQuote(quote)).toBe(false)
  })

  it('takes request copy only for the own slug', async () => {
    await expect(
      resolvePrintableQuote({ slug: customPrintSlug, text: 'Hold the line.', author: 'Ada' })
    ).resolves.toEqual({ slug: 'own', n: 0, text: 'Hold the line.', author: 'Ada' })
    await expect(resolvePrintableQuote({ slug: customPrintSlug, text: '  ' })).resolves.toBeNull()
  })
})

describe('print legibility at 300dpi', () => {
  const DPI = 300
  const MIN_INCHES = 0.2
  const { maxChars, maxLines } = quoteCard.quote

  /** Every print box the catalogue can actually produce. */
  const boxes = printProducts.flatMap((product) => [
    product.print,
    ...Object.values(product.printBySize || {}),
  ])

  /**
   * Only a handful of stored quotes carry text today, so the store's own limits
   * stand in for the ones yet to be written — a quote at `maxChars` across
   * `maxLines` is the worst thing the editor will accept, and therefore the
   * worst thing the renderer will ever be handed.
   */
  const worstCases = [
    { slug: 'max-chars', text: 'Relentless'.repeat(18).slice(0, maxChars), author: 'Anonymous' },
    {
      slug: 'max-lines',
      text: Array.from({ length: maxLines }, (_, i) => `Line ${i + 1} of it`).join('\n'),
      author: 'Anonymous',
    },
    { slug: 'one-long-word', text: 'Uncompromisingly'.repeat(4), author: '' },
  ]

  const samples = [...quotes.filter(isPrintableQuote), ...worstCases]

  it('has printable quotes to check', () => {
    expect(quotes.some(isPrintableQuote)).toBe(true)
    expect(worstCases.every((q) => q.text.length <= maxChars || q.slug === 'one-long-word')).toBe(
      true
    )
  })

  /** Every product, preset and sample the renderer can be asked for. */
  function sweep(visit) {
    for (const box of boxes) {
      for (const style of printStyles) {
        for (const lead of printLeadings) {
          for (const scale of printScales) {
          for (const quote of samples) {
            const measured = measurePrintFile({
              text: quote.text,
              author: quote.author,
              ...box,
              style: { ...style, ...lead, ...scale },
            })
            visit(measured, { box, style, lead, scale, quote })
          }
          }
        }
      }
    }
  }

  it('either fits inside the print area or reports that it does not', () => {
    sweep(({ design, fitted }, { box }) => {
      if (!fitted.fits) return
      const safe = Math.min(box.width, box.height) * design.padRatio * 2
      expect(fitted.height).toBeLessThanOrEqual(box.height - safe)
    })
  })

  it('keeps anything it does accept above the dtg detail floor', () => {
    let worst = { inches: Infinity }

    sweep(({ credit, fitted }, context) => {
      if (!fitted.fits) return
      // The credit sets smaller than the quote, so it is the binding case.
      const px = credit ? Math.min(fitted.size, fitted.metaSize) : fitted.size
      const inches = px / DPI
      if (inches < worst.inches) worst = { inches, ...context }
    })

    expect(worst.inches).toBeGreaterThanOrEqual(MIN_INCHES)
  })

  it('fits every quote the store actually holds, on every product', () => {
    const stored = quotes.filter(isPrintableQuote)
    for (const box of boxes) {
      for (const style of printStyles) {
        for (const lead of printLeadings) {
          for (const scale of printScales) {
          for (const quote of stored) {
            const { fitted } = measurePrintFile({
              text: quote.text,
              author: quote.author,
              ...box,
              style: { ...style, ...lead, ...scale },
            })
            expect(fitted.fits).toBe(true)
          }
          }
        }
      }
    }
  })

  it('refuses to render what it cannot fit, rather than overflowing', async () => {
    // Well past what the editor accepts, so the refusal is the contract being
    // tested rather than a happenstance of how the presets are currently tuned.
    const tooLong = {
      text: 'Relentless forward motion, every single day. '.repeat(20),
      author: 'Anonymous',
      width: 2700,
      height: 1050,
    }
    expect(measurePrintFile(tooLong).fitted.fits).toBe(false)
    await expect(renderPrintFile(tooLong)).rejects.toMatchObject({ status: 422 })
  })

  it('trades size for spacing, never overflow', () => {
    const box = { width: 3600, height: 4800 }
    const { text } = worstCases[0]
    const sizes = printLeadings.map(
      (lead) => measurePrintFile({ text, ...box, style: lead }).fitted.size
    )
    // Tight first, loose last: looser leading can only hold or shrink the type.
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeLessThanOrEqual(sizes[i - 1])
  })

  it('honours scale on a short quote that already fits', () => {
    const box = { width: 3600, height: 4800 }
    const sizes = printScales.map(
      (scale) => measurePrintFile({ text: 'Go.', ...box, style: scale }).fitted.size
    )
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeGreaterThan(sizes[i - 1])
  })
})

describe('preview compositing', () => {
  it('darkens a light garment and lightens a dark one', () => {
    expect(inkBlendMode('#111111')).toBe('multiply')
    expect(inkBlendMode('#f4f4f4')).toBe('screen')
  })

  it('falls back to multiply when the ink is malformed', () => {
    expect(inkBlendMode('#fff')).toBe('multiply')
    expect(inkBlendMode('')).toBe('multiply')
    expect(inkBlendMode(undefined)).toBe('multiply')
  })

  it('picks a blend mode for every catalogue ink', () => {
    for (const product of printProducts) {
      for (const color of product.colors) {
        expect(['multiply', 'screen']).toContain(inkBlendMode(color.ink))
      }
    }
  })
})

describe('mug preview wrap', () => {
  it('curves the mug preview and leaves the tee flat', () => {
    expect(printProducts.find((p) => p.id === 'mug').curve).toBe(true)
    expect(printProducts.find((p) => p.id === 'tee').curve).toBeFalsy()
  })

  it('maps the cylinder centre to the unwrap centre and keeps edges inside', () => {
    const width = 100
    expect(cylinderU(width / 2, width)).toBeCloseTo(0.5)
    expect(cylinderU(0, width)).toBeGreaterThan(0)
    expect(cylinderU(width - 1, width)).toBeLessThan(1)
    // Dest x is sin(theta), so equal dest steps cover more unwrap at the edges.
    const mid = cylinderU(50, width) - cylinderU(40, width)
    const edge = cylinderU(10, width) - cylinderU(0, width)
    expect(edge).toBeGreaterThan(mid)
  })
})

describe('printful print area', () => {
  it('converts template pixels to percentage boxes', () => {
    const frame = frameFrom({
      template_width: 1000,
      template_height: 1000,
      print_area_width: 300,
      print_area_height: 400,
      print_area_top: 250,
      print_area_left: 350,
    })
    expect(frame).toEqual({ top: 25, left: 35, width: 30, height: 40 })
  })

  it('accepts a print area flush to the top left', () => {
    const frame = frameFrom({
      template_width: 200,
      template_height: 200,
      print_area_width: 100,
      print_area_height: 100,
      print_area_top: 0,
      print_area_left: 0,
    })
    expect(frame).toEqual({ top: 0, left: 0, width: 50, height: 50 })
  })

  it('returns null on an incomplete template so the bundled frame stands', () => {
    expect(frameFrom(null)).toBeNull()
    expect(frameFrom({ template_width: 1000, print_area_width: 300 })).toBeNull()
  })

  it('prefers the template listing our variant, since mug sizes differ', () => {
    const rows = [
      { placement: 'default', catalog_variant_ids: [1320], template_width: 1 },
      { placement: 'default', catalog_variant_ids: [4830], template_width: 2 },
    ]
    expect(pickTemplate(rows, { placement: 'default', variantId: 4830 }).template_width).toBe(2)
  })

  it('falls back to the first template of the placement, ignoring others', () => {
    const rows = [
      { placement: 'label_outside', catalog_variant_ids: [1], template_width: 9 },
      { placement: 'front', catalog_variant_ids: [2], template_width: 3 },
    ]
    expect(pickTemplate(rows, { placement: 'front', variantId: 999 }).template_width).toBe(3)
    expect(pickTemplate([], { placement: 'front', variantId: 1 })).toBeNull()
  })

  it('reads the garment colour from the images payload', () => {
    expect(
      pickColour({ data: { images: [{ background_color: '#0c0c0c' }], primary_hex_color: '#fff' } })
    ).toBe('#0c0c0c')
    expect(pickColour({ data: { images: [{}], primary_hex_color: '#abcdef' } })).toBe('#abcdef')
    expect(pickColour({ data: { images: [] } })).toBeNull()
    expect(pickColour(null)).toBeNull()
  })
})

describe('print order status machine', () => {
  it('allows the documented happy path', () => {
    expect(canTransition('draft', 'awaiting_payment')).toBe(true)
    expect(canTransition('awaiting_payment', 'paid')).toBe(true)
    expect(canTransition('paid', 'submitted')).toBe(true)
    expect(canTransition('submitted', 'shipped')).toBe(true)
    expect(canTransition('shipped', 'delivered')).toBe(true)
  })

  it('refuses skipping payment or reviving terminal states', () => {
    expect(canTransition('draft', 'paid')).toBe(false)
    expect(canTransition('draft', 'submitted')).toBe(false)
    expect(canTransition('delivered', 'paid')).toBe(false)
    expect(canTransition('cancelled', 'paid')).toBe(false)
    expect(canTransition('nonsense', 'paid')).toBe(false)
  })

  it('allows an admin to retry a failed submission', () => {
    expect(canTransition('submit_failed', 'submitted')).toBe(true)
  })

  it('lets a shipping webhook land even if our submit write was lost', () => {
    expect(canTransition('paid', 'shipped')).toBe(true)
    expect(canTransition('submit_failed', 'shipped')).toBe(true)
  })

  it('inverts the flow to every state that can reach a target', () => {
    expect(sourcesOf('paid')).toEqual(['awaiting_payment'])
    expect(sourcesOf('shipped')).toEqual(
      expect.arrayContaining(['paid', 'submitted', 'fulfilled', 'submit_failed'])
    )
    expect(sourcesOf('draft')).toEqual([])
    for (const status of sourcesOf('submitted')) {
      expect(canTransition(status, 'submitted')).toBe(true)
    }
  })

  it('treats anything at or past submitted as handed off', () => {
    expect(isHandedOff('submitted')).toBe(true)
    expect(isHandedOff('delivered')).toBe(true)
    expect(isHandedOff('paid')).toBe(false)
    expect(isHandedOff('submit_failed')).toBe(false)
  })

  it('keeps the model enum in sync with the flow', () => {
    expect(printOrderStatuses).toContain('draft')
    expect(printOrderStatuses).toContain('delivered')
    for (const targets of Object.values(printOrderFlow)) {
      for (const target of targets) expect(printOrderStatuses).toContain(target)
    }
  })
})

describe('print file naming', () => {
  it('is deterministic for the same selection', () => {
    const args = { slug: 'be-better', productId: 'tee', color: 'white' }
    expect(printFileName(args)).toBe(printFileName(args))
  })

  it('differs by product and colour', () => {
    const base = { slug: 'be-better', productId: 'tee', color: 'white' }
    expect(printFileName(base)).not.toBe(printFileName({ ...base, color: 'black' }))
    expect(printFileName(base)).not.toBe(printFileName({ ...base, productId: 'mug' }))
    expect(printFileName(base)).not.toBe(printFileName({ ...base, slug: 'other' }))
  })

  it('differs across every type look, so none can serve stale art', () => {
    const base = { slug: 'be-better', productId: 'tee', color: 'white' }
    const names = printStyles.flatMap((s) =>
      printLeadings.flatMap((l) =>
        printScales.flatMap((z) =>
          printCredits.map((c) => printFileName({ ...base, style: `${s.id}:${l.id}:${z.id}:${c.id}` }))
        )
      )
    )
    expect(new Set(names).size).toBe(
      printStyles.length * printLeadings.length * printScales.length * printCredits.length
    )
  })

  it('differs by print size, so the two mug wraps cannot share a file', () => {
    const base = { slug: 'be-better', productId: 'mug', color: 'white' }
    const eleven = printFileName({ ...base, print: { width: 2700, height: 1050 } })
    const fifteen = printFileName({ ...base, print: { width: 2700, height: 1139 } })
    expect(eleven).not.toBe(fifteen)
  })

  it('produces a png filename carrying the product and colour', () => {
    expect(printFileName({ slug: 'a', productId: 'mug', color: 'black' })).toMatch(
      /^mug-black-[0-9a-f]{12}\.png$/
    )
  })

  it('keys own copy into the filename and leaves a blank body as catalog', () => {
    const base = { slug: 'own', productId: 'tee', color: 'white' }
    expect(printFileName({ ...base, body: '' })).toBe(printFileName(base))
    expect(printFileName({ ...base, body: 'a' })).not.toBe(printFileName(base))
  })

  it('reuses a local print file instead of rendering again', () => {
    expect(existingAssetUrl('print', 'missing-file.png')).toBeNull()
  })
})

describe('printful payload', () => {
  const customer = {
    name: 'Ada',
    email: 'ada@example.com',
    address1: '1 Main St',
    city: 'Austin',
    state: 'TX',
    zip: '73301',
    country: 'US',
  }

  it('converts cents to printful decimal strings', () => {
    const payload = printfulOrderPayload({
      orderNumber: 'BBY-1',
      customer,
      items: [{ variantId: 42, quantity: 2, retailPrice: 2800, printFileUrl: 'https://x/y.png', placement: 'front' }],
    })
    expect(payload.external_id).toBe('BBY-1')
    expect(payload.items[0].retail_price).toBe('28.00')
    expect(payload.items[0].files).toHaveLength(1)
    expect(payload.recipient.country_code).toBe('US')
    expect(payload.recipient.address2).toBe('')
  })

  it('omits external_id and files for a cost estimate', () => {
    const payload = printfulOrderPayload({
      customer,
      items: [{ variantId: 42, quantity: 1, retailPrice: 1600 }],
    })
    expect(payload.external_id).toBeUndefined()
    expect(payload.items[0].files).toEqual([])
    expect(payload.items[0].retail_price).toBe('16.00')
  })
})

describe('formatting and order numbers', () => {
  it('formats cents as currency', () => {
    expect(formatPrice(2800)).toBe('$28.00')
    expect(formatPrice(0)).toBe('$0.00')
    expect(formatPrice(undefined)).toBe('$0.00')
  })

  it('humanises statuses', () => {
    expect(formatStatus('submit_failed')).toBe('submit failed')
  })

  it('recaps every chosen axis, including a quantity of one', () => {
    expect(
      formatPrintSelection({
        product: { name: 'T-shirt' },
        swatch: { label: 'White' },
        size: 'S',
        placement: { label: 'Front' },
        look: resolvePrintLook({ style: 'bold', leading: 'tight', scale: 'large', credit: 'off' }),
        quantity: 1,
      })
    ).toBe('T-shirt · White · S · Front · Bold · Large · Tight · None · ×1')
  })

  it('labels a stored order from the catalog, including leading', () => {
    expect(
      formatPrintOrderItem({
        productId: 'tee',
        color: 'white',
        size: 'M',
        placement: 'front',
        style: 'round',
        leading: 'normal',
        scale: 'medium',
        credit: 'off',
        quantity: 1,
      })
    ).toBe('T-shirt · White · M · Front · Round · Medium · Normal · None · ×1')
  })

  it('joins a ship-to line and prefers a local print path for previews', () => {
    const customer = {
      name: 'Print Test',
      address1: '123 Main St',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      country: 'US',
    }
    expect(formatPrintShipTo(customer)).toBe('123 Main St · Austin, TX, US · 78701')
    expect(printPreviewSrc('https://www.bebetteryou.online/print/tee-white-abc.png')).toBe(
      '/print/tee-white-abc.png'
    )
    expect(presentPrintOrder({
      orderNumber: 'BBY-1',
      quoteSlug: 'bby-1',
      productId: 'tee',
      color: 'white',
      size: 'M',
      placement: 'front',
      style: 'round',
      leading: 'normal',
      scale: 'medium',
      credit: 'off',
      quantity: 1,
      retailPrice: 2800,
      shippingPrice: 495,
      taxAmount: 139,
      currency: 'USD',
      customer,
      printFileUrl: 'https://www.bebetteryou.online/print/tee-white-abc.png',
      status: 'awaiting_payment',
      createdAt: '2026-09-09T08:28:07.855Z',
    })).toMatchObject({
      itemLabel: 'T-shirt · White · M · Front · Round · Medium · Normal · None · ×1',
      locality: 'Austin, TX, US',
      artSrc: '/print/tee-white-abc.png',
      totalLabel: '$34.34',
      quoteSlug: 'bby-1',
      quoteHref: '/quotes/bby-1',
      href: '/dashboard/print-orders/BBY-1',
      canMarkPaid: true,
      canFulfill: false,
    })
    expect(presentPrintOrder({ quoteSlug: customPrintSlug }).quoteHref).toBeNull()
    expect(printOrderFlags({ status: 'paid' })).toEqual({ canMarkPaid: false, canFulfill: true })
    expect(printOrderFlags({ status: 'awaiting_payment', paymentProvider: 'stripe' })).toEqual({
      canMarkPaid: false,
      canFulfill: false,
    })
    expect(formatPrintOrderDate('2026-09-09T08:28:07.855Z')).toBe('2026-09-09')
  })

  it('generates prefixed, unique order numbers', () => {
    const a = newOrderNumber()
    const b = newOrderNumber()
    expect(a).toMatch(/^BBY-[0-9A-Z]+-[0-9A-Z]{4}$/)
    expect(a).not.toBe(b)
  })

  it('treats Atlas URI placeholders as unset', () => {
    const orig = process.env.MONGODB_URI
    process.env.MONGODB_URI = 'mongodb+srv://u:<db_password>@cluster0.mongodb.net/db'
    expect(mongoUri()).toBe('')
    process.env.MONGODB_URI = orig
  })

  it('can store print orders locally when Mongo is not usable', () => {
    const origUri = process.env.MONGODB_URI
    const origVercel = process.env.VERCEL
    process.env.MONGODB_URI = 'mongodb+srv://u:<db_password>@cluster0.mongodb.net/db'
    delete process.env.VERCEL
    expect(printOrdersReady()).toBe(true)
    process.env.MONGODB_URI = origUri
    if (origVercel === undefined) delete process.env.VERCEL
    else process.env.VERCEL = origVercel
  })
})
