import { appConfig, getUrl } from '@/config/app'
import { brand } from '@/config/site'
import { postHref } from '@/libs/blog-url'
import { booksHref } from '@/libs/books-url'

export const DEFAULT_NEWSLETTER_PREFS = Object.freeze({
  quotes: true,
  blog: true,
  books: true,
})

/** Match site: Iceberg = display, Jost = body (app/layout + tailwind). */
const FONT_DISPLAY = `'Iceberg', 'Jost', system-ui, sans-serif`
const FONT_BODY = `'Jost', system-ui, -apple-system, sans-serif`

export function normalizePrefs(input) {
  if (!input || typeof input !== 'object') return { ...DEFAULT_NEWSLETTER_PREFS }
  return {
    quotes: input.quotes !== false,
    blog: input.blog !== false,
    books: input.books !== false,
  }
}

export function manageUrl(token) {
  return getUrl(`/unsubscribe?t=${encodeURIComponent(token)}`)
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function cta(href, label) {
  return `<a href="${escapeHtml(href)}" style="font-family:${FONT_DISPLAY};background:#34d399;color:#0a140e;padding:12px 20px;text-decoration:none;display:inline-block;letter-spacing:0.04em;">${escapeHtml(label)}</a>`
}

function sectionLabel(text) {
  return `<p style="margin:28px 0 12px;font-family:${FONT_DISPLAY};font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#7a9e86;">${escapeHtml(text)}</p>`
}

/** Email-safe 2×2 quote card grid; renders only real cards. */
function quoteGridHtml(quotes = [], heading = 'More cards') {
  const cards = quotes.filter((q) => q?.src && q?.slug)
  if (!cards.length) return ''

  const cell = (q) => {
    if (!q) return '<td style="width:50%;padding:4px;"></td>'
    const href = getUrl(`/quotes/${q.slug}`)
    const src = getUrl(q.src)
    return `<td style="width:50%;padding:4px;vertical-align:top;">
      <a href="${href}" style="display:block;text-decoration:none;">
        <img src="${escapeHtml(src)}" alt="Quote #${q.n || ''}" width="260" style="width:100%;max-width:260px;height:auto;border:1px solid rgba(168,255,200,0.25);display:block;" />
      </a>
    </td>`
  }

  const rows = []
  for (let i = 0; i < cards.length; i += 2) {
    rows.push(`<tr>${cell(cards[i])}${cell(cards[i + 1])}</tr>`)
  }

  return `
    ${sectionLabel(heading)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${rows.join('')}
    </table>
  `
}

function postsListHtml(posts = []) {
  const rows = posts.filter((p) => p?.slug && p?.title)
  if (!rows.length) return ''
  const items = rows
    .map((p) => {
      const href = getUrl(postHref(p.slug))
      const blurb = p.excerpt || p.description || ''
      return `<li style="margin:0 0 12px;font-family:${FONT_BODY};">
        <a href="${href}" style="font-family:${FONT_DISPLAY};color:#e9fdf0;text-decoration:none;font-size:15px;">${escapeHtml(p.title)}</a>
        ${blurb ? `<br><span style="font-family:${FONT_BODY};color:#7a9e86;font-size:13px;line-height:1.45;">${escapeHtml(blurb)}</span>` : ''}
      </li>`
    })
    .join('')
  return `
    ${sectionLabel('From the blog')}
    <ul style="margin:0;padding-left:18px;line-height:1.45;font-family:${FONT_BODY};">${items}</ul>
  `
}

function bookPickHtml(book) {
  if (!book?.slug || !book?.title) return ''
  // Site URL only — Amazon in-email trips “link ≠ sending domain” spam checks.
  const href = getUrl(booksHref())
  return `
    ${sectionLabel('Book pick')}
    <p style="margin:0 0 4px;font-family:${FONT_DISPLAY};font-size:16px;color:#e9fdf0;">${escapeHtml(book.title)}</p>
    ${book.author ? `<p style="margin:0 0 8px;font-family:${FONT_BODY};color:#7a9e86;font-size:13px;">${escapeHtml(book.author)}</p>` : ''}
    ${book.blurb ? `<p style="margin:0 0 12px;font-family:${FONT_BODY};line-height:1.5;font-size:14px;">${escapeHtml(book.blurb)}</p>` : ''}
    <p style="margin:0;">${cta(href, 'View book')}</p>
  `
}

function shopHtml() {
  return `
    ${sectionLabel('Wear the words')}
    <p style="margin:0 0 12px;font-family:${FONT_BODY};line-height:1.5;font-size:14px;">
      Turn a quote into a tee or mug — print on demand from the shop.
    </p>
    <p style="margin:0;">${cta(getUrl('/shop'), 'Shop tees & mugs')}</p>
  `
}

/** Shared discovery block — only sections with real content. Shop always. */
export function discoveryHtml(extras = {}) {
  const { quotes = [], posts = [], book = null } = extras
  return `${quoteGridHtml(quotes)}${postsListHtml(posts)}${bookPickHtml(book)}${shopHtml()}`
}

function emailShell({ title, bodyHtml, token }) {
  const manage = token ? manageUrl(token) : getUrl('/')
  const home = getUrl('/')
  const chip = getUrl(brand.mark)
  return `
    <style type="text/css">
      @import url('https://fonts.googleapis.com/css2?family=Iceberg&family=Jost:wght@400;500&display=swap');
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Iceberg&family=Jost:wght@400;500&display=swap" rel="stylesheet" />
    <div style="font-family:${FONT_BODY};max-width:560px;margin:0 auto;background:#0a140e;color:#c6e8d2;padding:32px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px;">
        <tr>
          <td style="vertical-align:middle;">
            <p style="margin:0;font-family:${FONT_DISPLAY};font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#7a9e86;">${escapeHtml(brand.name)}</p>
            <h1 style="margin:8px 0 0;font-family:${FONT_DISPLAY};font-size:22px;color:#e9fdf0;font-weight:normal;">${escapeHtml(title)}</h1>
          </td>
          <td style="vertical-align:middle;text-align:right;width:48px;">
            <a href="${home}" style="display:inline-block;">
              <img src="${escapeHtml(chip)}" alt="${escapeHtml(brand.name)}" width="40" height="40" style="width:40px;height:40px;border-radius:50%;border:1px solid rgba(168,255,200,0.35);display:block;" />
            </a>
          </td>
        </tr>
      </table>
      ${bodyHtml}
      <p style="margin:28px 0 0;font-family:${FONT_BODY};font-size:12px;color:#7a9e86;line-height:1.5;">
        <a href="${manage}" style="font-family:${FONT_BODY};color:#34d399;">Manage preferences</a>
        · You’re getting this because you subscribed at ${escapeHtml(brand.name)}.
      </p>
    </div>
  `
}

export function buildWelcomeEmail({ token, prefs, extras = {} }) {
  const lines = []
  if (prefs.quotes) lines.push('Quote card roundups when we send them')
  if (prefs.blog) lines.push('New blog posts')
  if (prefs.books) lines.push('New book recommendations')
  if (!lines.length) lines.push('Nothing yet — turn topics back on anytime')

  const list = lines.map((l) => `<li style="margin:0 0 6px;font-family:${FONT_BODY};">${escapeHtml(l)}</li>`).join('')
  const bodyHtml = `
    <p style="margin:0 0 16px;font-family:${FONT_BODY};line-height:1.6;">You’re on the list. Here’s what you’ll get:</p>
    <ul style="margin:0 0 20px;padding-left:18px;line-height:1.5;font-family:${FONT_BODY};">${list}</ul>
    <p style="margin:0 0 8px;">${cta(getUrl('/'), 'Browse quotes')}</p>
    ${discoveryHtml(extras)}
  `
  return {
    subject: `You’re in — ${brand.name}`,
    html: emailShell({ title: 'Welcome', bodyHtml, token }),
    text: `You’re on the ${brand.name} list. Browse quotes: ${getUrl('/')}\nShop: ${getUrl('/shop')}\nManage: ${manageUrl(token)}`,
  }
}

export function buildQuoteEmail({ quote, token, extras = {} }) {
  const pageUrl = getUrl(`/quotes/${quote.slug}`)
  const imageUrl = quote.src ? getUrl(quote.src) : ''
  const author = quote.author ? ` — ${quote.author}` : ''
  const img = imageUrl
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px;">
        <tr>
          <td align="center" style="text-align:center;">
            <a href="${pageUrl}" style="display:inline-block;width:65%;max-width:365px;text-decoration:none;">
              <img src="${escapeHtml(imageUrl)}" alt="Quote card #${quote.n}" width="365" style="width:100%;max-width:365px;height:auto;border:1px solid rgba(168,255,200,0.25);display:block;" />
            </a>
          </td>
        </tr>
      </table>`
    : ''
  const bodyHtml = `
    ${img}
    <p style="margin:0 0 12px;font-family:${FONT_DISPLAY};font-size:18px;line-height:1.55;color:#e9fdf0;text-align:center;">“${escapeHtml(quote.text)}”${escapeHtml(author)}</p>
    <p style="margin:0 0 8px;text-align:center;">${cta(pageUrl, `Open card #${quote.n}`)}</p>
    ${discoveryHtml(extras)}
  `
  return {
    subject: `New quote #${quote.n} — ${brand.name}`,
    html: emailShell({ title: `Quote #${quote.n}`, bodyHtml, token }),
    text: `“${quote.text}”${author}\n${pageUrl}\n\nManage: ${manageUrl(token)}`,
  }
}

/** Roundup of several cards — for manual / Broadcast-style digests, not per-create mail. */
export function buildQuoteDigestEmail({ quotes = [], token, extras = {} }) {
  const cards = quotes.filter((q) => q?.slug && q?.src).slice(0, 6)
  const grid = digestGridHtml(cards)
  const bodyHtml = `
    <p style="margin:0 0 16px;font-family:${FONT_BODY};line-height:1.6;">
      Here’s a fresh set of cards from ${escapeHtml(brand.name)}. Save one, share one, or browse the full library.
    </p>
    ${grid}
    <p style="margin:20px 0 8px;">${cta(getUrl('/quotes'), 'Browse all cards')}</p>
    ${discoveryHtml({ ...extras, quotes: [] })}
  `
  const nums = cards.map((q) => `#${q.n}`).join(', ')
  return {
    subject: `Fresh cards ${nums} — ${brand.name}`,
    html: emailShell({ title: 'Quote cards', bodyHtml, token }),
    text: `Fresh cards from ${brand.name}: ${nums}\n\n${cards
      .map((q) => `#${q.n}\n${String(q.text || '').replace(/\n/g, ' ')}\n${getUrl(`/quotes/${q.slug}`)}`)
      .join('\n\n')}\n\nManage: ${manageUrl(token)}`,
  }
}

/** Digest grid: image-only cards (quote lives on the artwork). */
function digestGridHtml(quotes = []) {
  const cards = quotes.filter((q) => q?.src && q?.slug)
  if (!cards.length) return ''

  const cell = (q) => {
    if (!q) return '<td style="width:50%;padding:4px;"></td>'
    const href = getUrl(`/quotes/${q.slug}`)
    const src = getUrl(q.src)
    return `<td style="width:50%;padding:4px;vertical-align:top;">
      <a href="${href}" style="display:block;text-decoration:none;">
        <img src="${escapeHtml(src)}" alt="Quote #${q.n || ''}" width="260" style="width:100%;max-width:260px;height:auto;border:1px solid rgba(168,255,200,0.25);display:block;" />
      </a>
    </td>`
  }

  const rows = []
  for (let i = 0; i < cards.length; i += 2) {
    rows.push(`<tr>${cell(cards[i])}${cell(cards[i + 1])}</tr>`)
  }

  return `
    ${sectionLabel('Latest cards')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${rows.join('')}
    </table>
  `
}

/** First narrative paragraph from blog blocks, if any. */
export function firstBlogParagraph(post, maxLen = 420) {
  const blocks = Array.isArray(post?.blocks) ? post.blocks : []
  for (const block of blocks) {
    const text = typeof block?.text === 'string' ? block.text.trim() : ''
    if (!text) continue
    if (text.length <= maxLen) return text
    const cut = text.slice(0, maxLen)
    const at = cut.lastIndexOf(' ')
    return `${(at > 80 ? cut.slice(0, at) : cut).trim()}…`
  }
  return ''
}

/** Richer pre-CTA copy: excerpt, description, then opening paragraph — no dupes. */
export function blogSummaryParagraphs(post) {
  const parts = []
  const push = (value) => {
    const text = String(value || '').trim()
    if (!text) return
    if (parts.some((p) => p === text || p.includes(text) || text.includes(p))) return
    parts.push(text)
  }
  push(post?.excerpt)
  push(post?.description)
  push(firstBlogParagraph(post))
  return parts
}

export function bookSummaryParagraphs(book) {
  const parts = []
  const push = (value) => {
    const text = String(value || '').trim()
    if (!text) return
    if (parts.some((p) => p === text)) return
    parts.push(text)
  }
  push(book?.blurb)
  push(book?.description)
  return parts
}

function paragraphsHtml(parts) {
  return parts
    .map(
      (p, i) =>
        `<p style="margin:0 0 ${i === parts.length - 1 ? 20 : 12}px;font-family:${FONT_BODY};line-height:1.55;">${escapeHtml(p)}</p>`
    )
    .join('')
}

export function buildBlogEmail({ post, token, extras = {} }) {
  const pageUrl = getUrl(postHref(post.slug))
  const parts = blogSummaryParagraphs(post)
  const bodyHtml = `
    <p style="margin:0 0 12px;font-family:${FONT_DISPLAY};font-size:18px;line-height:1.45;color:#e9fdf0;">${escapeHtml(post.title)}</p>
    ${paragraphsHtml(parts)}
    <p style="margin:0 0 8px;">${cta(pageUrl, 'Read the post')}</p>
    ${discoveryHtml(extras)}
  `
  return {
    subject: `${post.title} — ${brand.name}`,
    html: emailShell({ title: 'New on the blog', bodyHtml, token }),
    text: `${post.title}\n\n${parts.join('\n\n')}\n\n${pageUrl}\n\nManage: ${manageUrl(token)}`,
  }
}

export function buildBookEmail({ book, token, extras = {} }) {
  const catalogUrl = getUrl(booksHref())
  const parts = bookSummaryParagraphs(book)
  const bodyHtml = `
    <p style="margin:0 0 8px;font-family:${FONT_DISPLAY};font-size:18px;line-height:1.45;color:#e9fdf0;">${escapeHtml(book.title)}</p>
    <p style="margin:0 0 12px;font-family:${FONT_BODY};color:#7a9e86;">${escapeHtml(book.author || '')}</p>
    ${paragraphsHtml(parts)}
    <p style="margin:0 0 8px;">${cta(catalogUrl, 'View book')}</p>
    ${discoveryHtml(extras)}
  `
  return {
    subject: `Book pick: ${book.title} — ${brand.name}`,
    html: emailShell({ title: 'New book pick', bodyHtml, token }),
    text: `${book.title}${book.author ? ` — ${book.author}` : ''}\n\n${parts.join('\n\n')}\n\n${catalogUrl}\n\nManage: ${manageUrl(token)}`,
  }
}
