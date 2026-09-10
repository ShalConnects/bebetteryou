/** Pure paging helpers shared by /quotes and /blog (safe for UI; no fs). */

export function paginate(items, page, pageSize) {
  const pages = Math.max(1, Math.ceil(items.length / pageSize))
  const p = Math.min(Math.max(1, Number(page) || 1), pages)
  const start = (p - 1) * pageSize
  return { items: items.slice(start, start + pageSize), page: p, pages, total: items.length, pageSize }
}

export function pageRange(page, pageSize, total) {
  if (!total) return null
  return { start: (page - 1) * pageSize + 1, end: Math.min(page * pageSize, total), total }
}

/** Compact page list with ellipses, e.g. [1, '…', 4, 5, 6, '…', 12]. */
export function pageWindow(current, total, radius = 1) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const keep = new Set([1, total, current])
  for (let i = current - radius; i <= current + radius; i++) {
    if (i >= 1 && i <= total) keep.add(i)
  }
  const sorted = [...keep].sort((a, b) => a - b)
  const out = []
  for (let i = 0; i < sorted.length; i++) {
    if (i && sorted[i] - sorted[i - 1] > 1) out.push('…')
    out.push(sorted[i])
  }
  return out
}
