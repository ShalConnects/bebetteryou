/** Pure share helpers — no React. */

const enc = encodeURIComponent

export function shareTargets({ url, text, media }) {
  const t = text ? `${text}\n${url}` : url
  return [
    { id: 'x', label: 'X', href: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(text || '')}` },
    { id: 'linkedin', label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
    { id: 'pinterest', label: 'Pinterest', href: `https://pinterest.com/pin/create/button/?url=${enc(url)}&media=${enc(media)}&description=${enc(text || '')}` },
    { id: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${enc(t)}` },
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

export function saveImage(src, fileName = 'quote.jpg') {
  const a = document.createElement('a')
  a.href = src
  a.download = fileName
  a.click()
}
