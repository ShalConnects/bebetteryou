import { blankKey, printProducts } from '@/config/print-products'
import { logError } from '@/libs/logger'
import { catalogGet, isPrintfulConfigured } from '@/libs/printful'

/**
 * Printful's own blank and print geometry for each `productId:colorId`.
 *
 * A mockup template carries both halves of the pair: the blank image and the
 * print area measured against that same image. They are only meaningful
 * together — Printful's box is in template pixels, so pairing it with our
 * bundled photo would place the art several percent off. A blank is therefore
 * all-or-nothing: image, colour and frame, or nothing and the bundled stand-in
 * stays.
 *
 * Only products flagged `catalogBlank` are fetched, because not every template
 * is a photo. Garment templates are ghost-mannequin shots, but the mug template
 * is a flat print dieline that would look broken behind a preview.
 *
 * Templates are static per variant and cached for a day. Returns `{}` with no
 * token configured, which is what keeps the page working before setup.
 */

/** Templates report the print box in template pixels; the preview wants percentages. */
export function frameFrom(template) {
  const {
    print_area_width: width,
    print_area_height: height,
    print_area_top: top,
    print_area_left: left,
    template_width: tw,
    template_height: th,
  } = template || {}

  if (![width, height, tw, th].every((n) => Number.isFinite(n) && n > 0)) return null
  if (![top, left].every((n) => Number.isFinite(n))) return null

  return {
    top: (top / th) * 100,
    left: (left / tw) * 100,
    width: (width / tw) * 100,
    height: (height / th) * 100,
  }
}

/**
 * Geometry is identical across variants of a placement for garments, but differs
 * per size for mugs, so prefer the template that actually lists our variant.
 */
export function pickTemplate(rows, { placement, variantId }) {
  const forPlacement = (rows || []).filter((row) => row?.placement === placement)
  const exact = forPlacement.find((row) => row.catalog_variant_ids?.includes(variantId))
  return exact || forPlacement[0] || null
}

/** Variant images hang off a single object, not a list, and carry the garment colour. */
export function pickColour(payload) {
  const root = payload?.data || payload
  const images = root?.images || []
  const withColour = images.find((image) => image?.background_color)
  return withColour?.background_color || root?.primary_hex_color || null
}

/**
 * The endpoint ignores a `placement` filter and a garment can carry a thousand
 * templates, with the printable placements well past the first page — so walk
 * pages until the placement turns up.
 */
async function templatesFor(catalogId, placement) {
  const found = []
  for (let offset = 0; offset < 1000; offset += 100) {
    const page = await catalogGet(
      `/v2/catalog-products/${catalogId}/mockup-templates?limit=100&offset=${offset}`
    )
    const rows = page?.data || []
    found.push(...rows.filter((row) => row?.placement === placement))
    if (found.length || rows.length < 100) break
  }
  return found
}

async function blankFor(product, color, placement) {
  const variantId = product.variants[`${color.id}:${product.sizes[0]}`]
  const catalogId = color.catalogId || product.catalogId
  if (!variantId || !catalogId) return null

  const [templates, images] = await Promise.all([
    templatesFor(catalogId, placement.id),
    catalogGet(`/v2/catalog-variants/${variantId}/images`),
  ])

  const template = pickTemplate(templates, { placement: placement.id, variantId })
  const frame = frameFrom(template)
  if (!template?.image_url || !frame) return null

  return {
    image: template.image_url,
    frame,
    backgroundColor: pickColour(images),
    /** `overlay` means the blank is drawn over the artwork, not under it. */
    overlay: template.template_positioning === 'overlay',
  }
}

let blanksMemo = null
let blanksAt = 0
let blanksPending = null
const BLANKS_TTL_MS = 86_400_000

export async function printBlanks() {
  if (!isPrintfulConfigured()) return {}
  if (blanksMemo && Date.now() - blanksAt < BLANKS_TTL_MS) return blanksMemo
  if (blanksPending) return blanksPending

  blanksPending = Promise.all(
    printProducts
      .filter((product) => product.catalogBlank)
      .flatMap((product) =>
        product.colors.flatMap((color) =>
          // Each placement is its own photo — a back print needs the back view.
          product.placements.map(async (placement) => {
            try {
              const blank = await blankFor(product, color, placement)
              return blank ? [blankKey(product.id, color.id, placement.id), blank] : null
            } catch (error) {
              // A missing blank degrades to the bundled one; it must not fail the page.
              logError('Printful blank lookup failed', error, {
                product: product.id,
                color: color.id,
                placement: placement.id,
              })
              return null
            }
          })
        )
      )
  )
    .then((entries) => {
      const map = Object.fromEntries(entries.filter(Boolean))
      if (Object.keys(map).length) {
        blanksMemo = map
        blanksAt = Date.now()
      }
      return map
    })
    .finally(() => {
      blanksPending = null
    })

  return blanksPending
}
