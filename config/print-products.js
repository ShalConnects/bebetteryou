/**
 * Printable products. Single source of truth for print specs, variant mapping,
 * preview placement, and retail price — the server never takes these from the client.
 *
 * Variant ids and catalog ids are the real ones, read from the Printful catalog
 * via `scripts/printful-probe.mjs`. Sizes use Printful's own labels so no
 * translation layer is needed between what the user picks and what we order.
 *
 * TODO(printful): `retail` is still guesswork — reset it from actual base cost
 * plus shipping plus the margin you want.
 */

/** Retail prices are in cents to keep money integer-only end to end. */
export const printCurrency = 'USD'

/**
 * Bump whenever the print renderer changes shape. Print files are named from a
 * hash of the selection, so without this a new design would keep serving the
 * previously cached PNG. Mirrors `cardRevision` for quote cards.
 */
export const printRevision = 2

export const printProducts = [
  {
    id: 'tee',
    name: 'T-shirt',
    blurb: 'Unisex cotton tee, DTG print.',
    retail: 2800,
    /**
     * 12x16in at 300dpi, Printful's max DTG area for this blank. Front and back
     * print areas differ only in size, not shape — 1010x1346 and 1031x1375, both
     * 3:4 — so one print file serves either placement.
     */
    print: { width: 3600, height: 4800 },
    /** Printful catalog product id, used to pull real blanks and print areas. */
    catalogId: 71,
    /** Printful's garment template is a real ghost-mannequin photo, so prefer it. */
    catalogBlank: true,
    /**
     * Printful placement ids, in offer order. `frame` is only the fallback box
     * for the bundled blank; a catalog blank brings its own. The back print sits
     * higher on the garment than the front, hence the different boxes.
     */
    placements: [
      { id: 'front', label: 'Front', frame: { top: 25, left: 34, width: 32, height: 42.7 } },
      { id: 'back', label: 'Back', frame: { top: 20, left: 34, width: 32, height: 42.7 } },
    ],
    colors: [
      { id: 'white', label: 'White', ink: '#111111', mockup: '/print-products/tee-white.png' },
      { id: 'black', label: 'Black', ink: '#f4f4f4', mockup: '/print-products/tee-black.png' },
    ],
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    variants: {
      'white:S': 4011,
      'white:M': 4012,
      'white:L': 4013,
      'white:XL': 4014,
      'white:2XL': 4015,
      'black:S': 4016,
      'black:M': 4017,
      'black:L': 4018,
      'black:XL': 4019,
      'black:2XL': 4020,
    },
  },
  {
    id: 'mug',
    name: 'Mug',
    blurb: 'Glossy ceramic mug, wrap print.',
    retail: 1600,
    print: { width: 2700, height: 1050 },
    /**
     * The 15 oz wrap is a different shape: Printful's print area is 671x261 on
     * the 11 oz but 649x274 on the 15 oz. Holding the width keeps the resolution
     * while the height follows that aspect, so art is not stretched on the
     * bigger mug. Garments need no equivalent — the tee's front print area is
     * identical across S to 2XL.
     */
    printBySize: { '15 oz': { width: 2700, height: 1139 } },
    /**
     * One wrap, so nothing to choose. No `catalogBlank` either: Printful's mug
     * template is a flat print dieline showing the unwrapped band, not a photo
     * of a mug, so it cannot back a preview. Only the front of the wrap is
     * visible side-on, so the band sits mid-body.
     */
    placements: [{ id: 'default', label: 'Wrap', frame: { top: 40, left: 28, width: 38, height: 15 } }],
    /**
     * Preview-only: wrap the artwork onto a cylinder. The print file stays a
     * flat unwrap — Printful bends it when it prints.
     */
    curve: true,
    /** Printful sells the black mug as its own product, so the id lives per colour. */
    colors: [
      {
        id: 'white',
        label: 'White',
        ink: '#111111',
        catalogId: 19,
        mockup: '/print-products/mug-white.png',
      },
      {
        id: 'black',
        label: 'Black',
        ink: '#f4f4f4',
        catalogId: 300,
        mockup: '/print-products/mug-black.png',
      },
    ],
    sizes: ['11 oz', '15 oz'],
    variants: {
      'white:11 oz': 1320,
      'white:15 oz': 4830,
      'black:11 oz': 9323,
      'black:15 oz': 9324,
    },
  },
]

/** Client-safe view — drops the variant map so the browser never sees fulfilment ids. */
export const publicPrintProducts = printProducts.map(({ variants, ...rest }) => rest)

/**
 * Key for a Printful blank. Lives here rather than beside the fetcher because
 * the browser needs it to read the map, and the fetcher's module reaches for an
 * api token that has no business in a client bundle.
 */
export function blankKey(productId, colorId, placementId) {
  return `${productId}:${colorId}:${placementId}`
}

export function getPrintProduct(productId) {
  return printProducts.find((p) => p.id === productId) || null
}

/** Print dimensions for a size, falling back to the product's default. */
function printFor(product, size) {
  return (size && product.printBySize?.[size]) || product.print
}

/**
 * Validate a client selection against the catalog.
 * `size` is optional so the design route can resolve ink without picking a size.
 * `placement` falls back to the product's first, which is the only one for a mug.
 * @returns {{ product, color, size, placement, variantId, retail, print } | null}
 */
export function resolveSelection({ productId, color, size, placement } = {}) {
  const product = getPrintProduct(productId)
  if (!product) return null

  const swatch = product.colors.find((c) => c.id === color)
  if (!swatch) return null

  const spot = placement
    ? product.placements.find((p) => p.id === placement)
    : product.placements[0]
  if (!spot) return null

  const base = { product, color: swatch, placement: spot, retail: product.retail }

  if (size === undefined) {
    return { ...base, size: null, variantId: null, print: product.print }
  }

  if (!product.sizes.includes(size)) return null
  const variantId = product.variants[`${color}:${size}`]
  return {
    ...base,
    size,
    variantId: variantId || null,
    print: printFor(product, size),
  }
}

/** Line total in cents. Shipping and tax come from Printful, not from here. */
export function lineSubtotal(retail, quantity) {
  return retail * quantity
}
