/**
 * One-off connectivity check for a Printful token. Reads the key from .env.local
 * so the secret never lands in shell history, then reports the catalog variant
 * ids we need for config/print-products and the print-area geometry that
 * libs/printful-catalog maps into preview frames.
 *
 * Usage: node scripts/printful-probe.mjs
 */
import { readFileSync } from 'node:fs'

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const key = env.match(/^PRINTFUL_API_KEY=(.+)$/m)?.[1]?.trim()
if (!key) {
  console.error('PRINTFUL_API_KEY missing from .env.local')
  process.exit(1)
}

const BASE = 'https://api.printful.com'

async function get(pathname) {
  const res = await fetch(`${BASE}${pathname}`, { headers: { Authorization: `Bearer ${key}` } })
  const body = await res.json().catch(() => null)
  if (res.status < 200 || res.status >= 300) {
    console.log(`  !! ${pathname} -> ${res.status} ${JSON.stringify(body)?.slice(0, 200)}`)
    return null
  }
  return body
}

/** Walks every page so nothing important hides past the first 100 rows. */
async function getAll(pathname) {
  const rows = []
  for (let offset = 0; offset < 1000; offset += 100) {
    const join = pathname.includes('?') ? '&' : '?'
    const page = await get(`${pathname}${join}limit=100&offset=${offset}`)
    const data = page?.data || []
    rows.push(...data)
    if (data.length < 100) break
  }
  return rows
}

for (const [label, catalogId, sizes] of [
  ['tee', 71, ['S', 'M', 'L', 'XL', '2XL']],
  ['white mug', 19, ['11 oz', '15 oz']],
  ['black mug', 300, ['11 oz', '15 oz']],
]) {
  const variants = await getAll(`/v2/catalog-products/${catalogId}/catalog-variants`)
  const colours = [...new Set(variants.map((v) => v.color))]
  console.log(`\n=== ${label} (product ${catalogId}) — ${variants.length} variants`)
  console.log(`colours (${colours.length}):`, colours.slice(0, 8).join(' | '), colours.length > 8 ? '…' : '')

  for (const colour of ['White', 'Black']) {
    const rows = variants
      .filter((v) => v.color === colour && sizes.includes(v.size))
      .sort((a, b) => sizes.indexOf(a.size) - sizes.indexOf(b.size))
    if (rows.length) console.log(`  ${colour}:`, rows.map((v) => `'${v.size}': ${v.id}`).join(', '))
  }
}

for (const [label, catalogId, placement] of [
  ['tee', 71, 'front'],
  ['white mug', 19, 'default'],
  ['black mug', 300, 'default'],
]) {
  const templates = await getAll(`/v2/catalog-products/${catalogId}/mockup-templates`)
  const matching = templates.filter((t) => t.placement === placement)
  console.log(`\n=== ${label} templates — ${templates.length} total, ${matching.length} for "${placement}"`)
  for (const t of matching.slice(0, 3)) {
    const frame = {
      top: +((t.print_area_top / t.template_height) * 100).toFixed(1),
      left: +((t.print_area_left / t.template_width) * 100).toFixed(1),
      width: +((t.print_area_width / t.template_width) * 100).toFixed(1),
      height: +((t.print_area_height / t.template_height) * 100).toFixed(1),
    }
    console.log({
      technique: t.technique,
      positioning: t.template_positioning,
      template: `${t.template_width}x${t.template_height}`,
      frame,
      variants: t.catalog_variant_ids?.slice(0, 4),
      image: t.image_url?.slice(0, 95),
    })
  }
}
