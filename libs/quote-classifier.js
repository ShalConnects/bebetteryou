/**
 * Nearest-centroid classifier. Each catalog tag is the average of its library
 * quotes, so a new line is scored by how close it sits to those examples.
 */

const STOP = new Set([
  'the', 'and', 'you', 'your', 'for', 'that', 'this', 'with', 'are', 'was', 'but', 'not', 'from',
  'have', 'what', 'when', 'who', 'how', 'its', 'it', 'they', 'them', 'their', 'will', 'just', 'than',
  'then', 'into', 'about', 'some', 'more', 'most', 'can', 'all', 'our', 'out', 'too', 'very',
])

export function tokenizeQuote(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOP.has(word))
}

function termFreq(tokens) {
  const counts = {}
  for (const token of tokens) counts[token] = (counts[token] || 0) + 1
  return counts
}

function l2(vec) {
  let sum = 0
  for (const weight of Object.values(vec)) sum += weight * weight
  return Math.sqrt(sum) || 1
}

function scale(vec, idf) {
  const weighted = {}
  for (const [token, count] of Object.entries(vec)) {
    const weight = idf[token]
    if (!weight) continue
    weighted[token] = count * weight
  }
  const norm = l2(weighted)
  for (const token of Object.keys(weighted)) weighted[token] /= norm
  return weighted
}

function cosine(left, right) {
  let sum = 0
  const [small, large] = Object.keys(left).length < Object.keys(right).length ? [left, right] : [right, left]
  for (const [token, weight] of Object.entries(small)) {
    if (large[token]) sum += weight * large[token]
  }
  return sum
}

/** Fit one centroid per catalog tag from `{ text, tags }[]`. */
export function trainQuoteClassifier(examples, tagNames) {
  const docs = (Array.isArray(examples) ? examples : []).filter((row) => row?.text && Array.isArray(row.tags) && row.tags.length)
  const names = [...new Set((tagNames || []).filter(Boolean))]
  const prepared = docs.map((row) => ({ tags: row.tags, tokens: tokenizeQuote(row.text) }))
  const documentFrequency = {}
  for (const doc of prepared) {
    for (const token of new Set(doc.tokens)) documentFrequency[token] = (documentFrequency[token] || 0) + 1
  }
  const idf = {}
  const total = prepared.length
  for (const [token, count] of Object.entries(documentFrequency)) {
    idf[token] = Math.log((total + 1) / (count + 1)) + 1
  }

  const classes = {}
  for (const name of names) {
    const sum = {}
    let support = 0
    for (const doc of prepared) {
      if (!doc.tags.includes(name)) continue
      support += 1
      const vec = scale(termFreq(doc.tokens), idf)
      for (const [token, weight] of Object.entries(vec)) sum[token] = (sum[token] || 0) + weight
    }
    if (support) {
      for (const token of Object.keys(sum)) sum[token] /= support
    }
    const norm = l2(sum)
    for (const token of Object.keys(sum)) sum[token] /= norm
    classes[name] = { centroid: sum, support }
  }

  return { classes, idf, tags: names, docs: total }
}

/** Cosine similarity to each tag centroid, highest first. 0 means no shared vocabulary. */
export function scoreQuote(model, text) {
  const tokens = tokenizeQuote(text)
  if (!model?.docs || !tokens.length) return []
  const vec = scale(termFreq(tokens), model.idf)
  if (!Object.keys(vec).length) {
    return model.tags.map((tag) => ({ tag, confidence: 0 }))
  }
  return model.tags
    .map((tag) => ({ tag, confidence: cosine(vec, model.classes[tag]?.centroid || {}) }))
    .sort((a, b) => b.confidence - a.confidence || a.tag.localeCompare(b.tag))
}
