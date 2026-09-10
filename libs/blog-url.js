/** Pure URL + slug helpers for /blog (safe for UI; no fs). */

export function postHref(slug) {
  return `/blog/${slug}`
}

export function blogHref({ topic, page } = {}) {
  const q = new URLSearchParams()
  if (topic) q.set('topic', topic)
  if (page > 1) q.set('page', String(page))
  const s = q.toString()
  return s ? `/blog?${s}` : '/blog'
}

export function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** `topic` + `modifier` → one clean segment, e.g. morning-motivation-for-students. */
export function postSlug(topic, modifier) {
  return [topic, modifier].filter(Boolean).map(slugify).join('-')
}

export function blogListTitle({ label, page }) {
  const parts = [label || 'Blog']
  if (page > 1) parts.push(`Page ${page}`)
  return parts.join(' — ')
}
