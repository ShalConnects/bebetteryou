import { createHash } from 'crypto'
import { printRevision } from '@/config/print-products'
import { existingAssetUrl, saveAsset } from './asset-store'

/**
 * Deterministic name so the same design resolves to one stored file.
 * Printful fetches the print file when the item enters production, which can be
 * days after checkout, so these URLs must be permanent — never pre-signed.
 *
 * The print dimensions and type style are part of the key because they are what
 * actually make two files differ: mug sizes have different wrap shapes, while
 * every tee size shares one front print area and so can share one file.
 */
export function printFileName({ slug, productId, color, print, style, body }) {
  const spec = print ? `${print.width}x${print.height}` : ''
  const digest = createHash('sha1')
    .update(`${slug}:${productId}:${color}:${spec}:${style || ''}${body ? `:${body}` : ''}:r${printRevision}`)
    .digest('hex')
    .slice(0, 12)
  return `${productId}-${color}-${digest}.png`
}

export async function savePrintFile(filename, buffer) {
  return saveAsset({ dir: 'print', filename, buffer, contentType: 'image/png' })
}

/**
 * Per-instance memo; rendering is CPU-heavy and the output is content-addressed.
 * Capped because the key space is every quote times every product, colour and
 * print size, which a crawler could walk.
 */
const rendered = new Map()
const MEMO_LIMIT = 500

export async function savePrintFileOnce(filename, render) {
  const cached = rendered.get(filename)
  if (cached) return cached

  const existing = existingAssetUrl('print', filename)
  if (existing) {
    const hit = Promise.resolve(existing)
    rendered.set(filename, hit)
    return hit
  }

  const pending = render()
    .then((buffer) => savePrintFile(filename, buffer))
    .catch((error) => {
      rendered.delete(filename)
      throw error
    })

  if (rendered.size >= MEMO_LIMIT) rendered.delete(rendered.keys().next().value)
  rendered.set(filename, pending)
  return pending
}
