/**
 * Type presets for print artwork.
 *
 * A short allowlist rather than free font and size controls, because print files
 * are permanent — Printful fetches them when the item enters production, days
 * after checkout — so every combination a visitor previews is stored for good.
 * A fixed list keeps that space bounded and lets every option be fit-checked
 * against every print area.
 *
 * Scale is the same kind of allowlist. A free size slider would multiply stored
 * files without bound; three starting sizes still go through the fitter, so a
 * long quote cannot overflow the print area — Large only wins when the quote
 * already fits.
 */
export const printStyles = [
  { id: 'round', label: 'Round', font: 'NovaRound' },
  { id: 'soft', label: 'Soft', font: 'Comfortaa' },
  { id: 'bold', label: 'Bold', font: 'Bungee' },
]

export const defaultPrintStyle = printStyles[0]

/**
 * Line spacing. Looser leading makes the wrapped block taller and the renderer
 * fits to a smaller size, so the art stays inside Printful's print area.
 */
export const printLeadings = [
  { id: 'tight', label: 'Tight', lineHeight: 1.15 },
  { id: 'normal', label: 'Normal', lineHeight: 1.32 },
  { id: 'loose', label: 'Loose', lineHeight: 1.5 },
]

export const defaultPrintLeading = printLeadings[1]

/** Falls back rather than throwing: artwork is never shaped by a request body. */
export function resolvePrintStyle(id) {
  return printStyles.find((style) => style.id === id) || defaultPrintStyle
}

export function resolvePrintLeading(id) {
  return printLeadings.find((lead) => lead.id === id) || defaultPrintLeading
}

/**
 * Starting type size relative to the print box. Medium matches the renderer's
 * defaults; Small and Large keep the credit line at half the quote.
 */
export const printScales = [
  { id: 'small', label: 'Small', sizeRatio: 0.14, metaRatio: 0.07 },
  { id: 'medium', label: 'Medium', sizeRatio: 0.2, metaRatio: 0.1 },
  { id: 'large', label: 'Large', sizeRatio: 0.28, metaRatio: 0.14 },
]

export const defaultPrintScale = printScales[1]

export function resolvePrintScale(id) {
  return printScales.find((scale) => scale.id === id) || defaultPrintScale
}

/**
 * Whether the author line prints under the quote. Missing URL values fall back
 * to Credit so older links keep the previous artwork. The designer still
 * defaults None when the stored author is blank or "Unknown".
 */
export const printCredits = [
  { id: 'on', label: 'Credit' },
  { id: 'off', label: 'None' },
]

export const defaultPrintCredit = printCredits[0]

export function resolvePrintCredit(id) {
  return printCredits.find((credit) => credit.id === id) || defaultPrintCredit
}

export function creditForAuthor(author) {
  const name = String(author || '').trim()
  return !name || /^unknown$/i.test(name) ? printCredits[1] : printCredits[0]
}

/**
 * Type overlays compose here so the renderer, the filename and the order
 * record cannot disagree on what a selection means.
 */
export function resolvePrintLook({ style, leading, scale, credit } = {}) {
  const type = resolvePrintStyle(style)
  const lead = resolvePrintLeading(leading)
  const sizing = resolvePrintScale(scale)
  const byline = resolvePrintCredit(credit)
  return {
    type,
    lead,
    scale: sizing,
    credit: byline,
    id: `${type.id}:${lead.id}:${sizing.id}:${byline.id}`,
    style: { ...type, ...lead, ...sizing },
  }
}
