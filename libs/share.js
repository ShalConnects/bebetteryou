/** Pure share helpers — no React. */

const enc = encodeURIComponent

export function shareTargets({ url, text, media }) {
  const t = text ? `${text}\n${url}` : url
  return [
    { id: 'x', label: 'X', href: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(text || '')}` },
    { id: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { id: 'linkedin', label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
    { id: 'pinterest', label: 'Pinterest', href: `https://pinterest.com/pin/create/button/?url=${enc(url)}&media=${enc(media)}&description=${enc(text || '')}` },
    { id: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${enc(t)}` },
    { id: 'telegram', label: 'Telegram', href: `https://t.me/share/url?url=${enc(url)}&text=${enc(text || '')}` },
    { id: 'threads', label: 'Threads', href: `https://www.threads.net/intent/post?text=${enc(t)}` },
    { id: 'bluesky', label: 'Bluesky', href: `https://bsky.app/intent/compose?text=${enc(t)}` },
  ]
}

/** Native share sheet, or copy link. Returns a short status message when copying. */
export async function shareOrCopy({ title, text, url }) {
  if (typeof navigator !== 'undefined' && navigator.share) {
    await navigator.share({ title, text, url })
    return null
  }
  await navigator.clipboard.writeText(url)
  return 'Link copied'
}

/** Copy plain text (thought + action) without forcing a share sheet. */
export async function copyText(text) {
  await navigator.clipboard.writeText(String(text || ''))
  return 'Text copied'
}

export function saveImage(src, fileName = 'quote.jpg') {
  const a = document.createElement('a')
  a.download = fileName
  /** Cross-origin (e.g. Vercel Blob) ignores `download` on a direct href — fetch first. */
  if (/^https?:\/\//i.test(src) && typeof location !== 'undefined' && !src.startsWith(location.origin)) {
    return fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error('Could not download')
        return res.blob()
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        a.href = url
        a.click()
        URL.revokeObjectURL(url)
      })
  }
  a.href = src
  a.click()
  return Promise.resolve()
}
