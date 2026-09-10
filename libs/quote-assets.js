import fs from 'fs'
import path from 'path'
import { saveAsset } from './asset-store'

const quotesDir = path.join(process.cwd(), 'public/quotes')

/** Persist JPEG; returns public src URL (local path or Blob URL). */
export async function saveQuoteImage(filename, buffer) {
  return saveAsset({ dir: 'quotes', filename, buffer, contentType: 'image/jpeg' })
}

export function deleteQuoteImage(n) {
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL) return
  const file = path.join(quotesDir, `bby${n}.jpg`)
  if (fs.existsSync(file)) fs.unlinkSync(file)
}
