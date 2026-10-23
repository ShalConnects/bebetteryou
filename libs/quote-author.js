/** Fill an author when Wikiquote credits one person and nobody else. */

const MIN_WORDS = 5
const SEARCH_URL = 'https://en.wikiquote.org/w/api.php'
const USER_AGENT = 'BeBetterYou/1.0 (https://www.bebetteryou.online; admin quote attribution)'

const TOKEN = /([A-Z]\.(?=\s|[A-Z]|$)|[A-Z][\p{L}'’-]+)/yu
const PARTICLE = /^(de|da|di|du|van|von|bin|al|of)$/i
const STOP_WORD = /^(the|a|an|not|some|all|and|it|book)$/i

const MONTHS = new Set(['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'])
const BLOCKED = new Set([
  'anonymous', 'unknown', 'misattributed', 'traditional', 'various', 'proverbs', 'wikipedia',
  'fear', 'love', 'travel', 'life', 'time', 'success', 'happiness', 'wisdom', 'courage',
  'hope', 'faith', 'peace', 'war', 'truth', 'beauty', 'god', 'bible', 'quotes',
])

function wordsOf(quote) {
  return String(quote ?? '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1)
}

function plainText(value) {
  return String(value ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

/** Same person, ignoring initials punctuation: "J.R.R. Tolkien" and "J. R. R. Tolkien". */
export function authorKey(name) {
  const parts = String(name ?? '')
    .toLowerCase()
    .replace(/\./g, '')
    .split(/\s+/)
    .filter(Boolean)
  const merged = []
  let initials = ''
  for (const part of parts) {
    if (part.length === 1) initials += part
    else {
      if (initials) merged.push(initials)
      initials = ''
      merged.push(part)
    }
  }
  if (initials) merged.push(initials)
  return merged.join(' ')
}

export function personName(raw) {
  const text = String(raw ?? '').replace(/\s+/g, ' ').trim()
  const tokens = []
  let index = 0
  while (tokens.length < 6 && index < text.length) {
    if (text[index] === ' ') index += 1
    const particle = text.slice(index).match(/^(de|da|di|du|van|von|bin|al|of)(?=\s)/i)
    if (particle && tokens.length) {
      const after = text.slice(index + particle[0].length).trimStart()
      if (!/^[A-Z]/.test(after)) break
      tokens.push(particle[1])
      index += particle[0].length
      continue
    }
    TOKEN.lastIndex = index
    const match = TOKEN.exec(text)
    if (!match || match.index !== index) break
    if (STOP_WORD.test(match[1])) break
    tokens.push(match[1])
    index = TOKEN.lastIndex
    if (/[\p{L}]{2}/u.test(match[1]) && text[index] === '.') break
  }
  while (tokens.length && PARTICLE.test(tokens[tokens.length - 1])) tokens.pop()
  if (!tokens.some((token) => token.replace(/\./g, '').length >= 2)) return ''
  const name = tokens.join(' ')
  if (BLOCKED.has(name.toLowerCase())) return ''
  return name
}

function looksLikePerson(title) {
  const cleaned = String(title ?? '').replace(/\s+/g, ' ').trim()
  if (!cleaned || MONTHS.has(cleaned.split(' ')[0].toLowerCase())) return false
  return personName(cleaned) === cleaned
}

function quoteSpan(plain, quote) {
  const words = wordsOf(quote)
  if (words.length < MIN_WORDS) return null
  const escaped = words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  for (let size = words.length; size >= MIN_WORDS; size -= 1) {
    for (let start = 0; start + size <= words.length; start += 1) {
      const pattern = escaped.slice(start, start + size).join('[^a-z0-9]+')
      const match = new RegExp(pattern, 'i').exec(plain)
      if (match) return match
    }
  }
  return null
}

function explicitAuthor(after) {
  const tail = after.replace(/^[\s.!?)"'\]]+/, '')
  const marked = tail.match(/^~\s*(.+?)\s~/) || tail.match(/^[—–-]\s*(.+)$/) || tail.match(/^([^,]{2,80}),/)
  return marked ? personName(marked[1]) : ''
}

function creditFromHit(quote, hit) {
  const plain = plainText(hit?.snippet)
  const span = quoteSpan(plain, quote)
  if (!span) return { credit: '', needsIntro: false }
  const before = plain.slice(Math.max(0, span.index - 120), span.index)
  if (/misattributed/i.test(before)) return { credit: '', needsIntro: false }
  const after = plain.slice(span.index + span[0].length, span.index + span[0].length + 90)
  const explicit = explicitAuthor(after)
  if (explicit) return { credit: explicit, needsIntro: false }
  if (looksLikePerson(hit.title)) return { credit: personName(hit.title), needsIntro: false }
  return { credit: '', needsIntro: true, title: hit.title }
}

function authorByLine(intro) {
  const plain = plainText(intro)
  const index = plain.search(/\bby\s+[A-Z]/)
  if (index < 0) return ''
  return personName(plain.slice(index).replace(/^by\s+/, ''))
}

/** The one person every matching page names. Blank when pages disagree or nobody is named. */
export function authorFromSources(quote, hits = [], intros = {}) {
  if (wordsOf(quote).length < MIN_WORDS) return ''
  const credits = []
  for (const hit of hits) {
    const found = creditFromHit(quote, hit)
    if (found.credit) credits.push(found.credit)
    else if (found.needsIntro && found.title) {
      const byline = authorByLine(intros[found.title])
      if (byline) credits.push(byline)
    }
  }
  const keys = credits.map(authorKey).filter(Boolean)
  if (new Set(keys).size !== 1) return ''
  return credits.find((name) => authorKey(name) === keys[0]) || ''
}

async function readJson(res) {
  if (!res.ok) return null
  return res.json()
}

async function wikiquote(params, fetchImpl) {
  const url = `${SEARCH_URL}?${new URLSearchParams({ ...params, utf8: '1', format: 'json' })}`
  const res = await fetchImpl(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  })
  return readJson(res)
}

function hitCreditsQuote(quote, hit) {
  const found = creditFromHit(quote, hit)
  return Boolean(found.credit || found.needsIntro)
}

async function searchHits(srsearch, fetchImpl) {
  const data = await wikiquote({
    action: 'query',
    list: 'search',
    srsearch,
    srlimit: '5',
    srprop: 'snippet',
  }, fetchImpl)
  return data?.query?.search || []
}

/**
 * Look up a pasted line. Returns '' when the line is unknown, too short,
 * or the pages do not agree on one person.
 */
export async function findQuoteAuthor(text, fetchImpl = fetch) {
  const quote = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (wordsOf(quote).length < MIN_WORDS) return ''
  try {
    const phrase = quote.replace(/["“”]/g, '').slice(0, 180)
    let hits = await searchHits(`"${phrase}"`, fetchImpl)
    if (!hits.some((hit) => hitCreditsQuote(quote, hit))) {
      const words = wordsOf(quote).slice(0, 10).join(' ')
      const broader = await searchHits(words, fetchImpl)
      if (broader.some((hit) => hitCreditsQuote(quote, hit))) hits = broader
    }
    const titles = []
    for (const hit of hits) {
      const found = creditFromHit(quote, hit)
      if (found.needsIntro && found.title && !titles.includes(found.title)) titles.push(found.title)
    }
    const intros = {}
    if (titles.length) {
      const pages = await wikiquote({
        action: 'query',
        prop: 'extracts',
        exintro: '1',
        explaintext: '1',
        exchars: '500',
        titles: titles.slice(0, 4).join('|'),
      }, fetchImpl)
      for (const page of Object.values(pages?.query?.pages || {})) {
        if (page?.title) intros[page.title] = page.extract || ''
      }
    }
    return authorFromSources(quote, hits, intros)
  } catch {
    return ''
  }
}
