import fs from 'fs'
import path from 'path'

/**
 * Persist a public asset under `public/<dir>/` locally, or Vercel Blob when
 * BLOB_READ_WRITE_TOKEN is set. Returns the public URL either way.
 */
export async function saveAsset({ dir, filename, buffer, contentType }) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob')
    const blob = await put(`${dir}/${filename}`, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    })
    return blob.url
  }

  if (process.env.VERCEL) {
    throw new Error(`BLOB_READ_WRITE_TOKEN required to save ${dir} assets on Vercel`)
  }

  const outDir = path.join(process.cwd(), 'public', dir)
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, filename), buffer)
  return `/${dir}/${filename}`
}

/** Local disk only — Blob URLs are not derivable from the filename. */
export function existingAssetUrl(dir, filename) {
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL) return null
  const file = path.join(process.cwd(), 'public', dir, filename)
  return fs.existsSync(file) ? `/${dir}/${filename}` : null
}
