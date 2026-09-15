import { appConfig, getUrl } from '@/config/app'
import { brand } from '@/config/site'
import { bookUrl } from '@/config/books'
import { postHref } from '@/libs/blog-url'
import { booksHref } from '@/libs/books-url'

export const DEFAULT_NEWSLETTER_PREFS = Object.freeze({
  quotes: true,
  blog: true,
  books: true,
})

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
  return `<a href="${escapeHtml(href)}" style="background:#34d399;color:#0a140e;padding:12px 20px;text-decoration:none;display:inline-block;">${escapeHtml(label)}</a>`
}

function sectionLabel(text) {
  return `<p style="margin:28px 0 12px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#7a9e86;">${escapeHtml(text)}</p>`
}

/** Email-safe 2×2 quote card grid; renders only real cards. */
function quoteGridHtml(quotes = []) {
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
    ${sectionLabel('Quote cards')}
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
      return `<li style="margin:0 0 12px;">
        <a href="${href}" style="color:#e9fdf0;text-decoration:none;font-size:15px;">${escapeHtml(p.title)}</a>
        ${blurb ? `<br><span style="color:#7a9e86;font-size:13px;line-height:1.45;">${escapeHtml(blurb)}</span>` : ''}
      </li>`
    })
    .join('')
  return `
    ${sectionLabel('From the blog')}
    <ul style="margin:0;padding-left:18px;line-height:1.45;">${items}</ul>
  `
}

function bookPickHtml(book) {
  if (!book?.slug || !book?.title) return ''
  const href = bookUrl(book) || getUrl(booksHref())
  return `
    ${sectionLabel('Book pick')}
    <p style="margin:0 0 4px;font-size:16px;color:#e9fdf0;">${escapeHtml(book.title)}</p>
    ${book.author ? `<p style="margin:0 0 8px;color:#7a9e86;font-size:13px;">${escapeHtml(book.author)}</p>` : ''}
    ${book.blurb ? `<p style="margin:0 0 12px;line-height:1.5;font-size:14px;">${escapeHtml(book.blurb)}</p>` : ''}
    <p style="margin:0;">${cta(href, 'View book')}</p>
  `
}

function shopHtml() {
  return `
    ${sectionLabel('Wear the words')}
    <p style="margin:0 0 12px;line-height:1.5;font-size:14px;">
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
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#0a140e;color:#c6e8d2;padding:32px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px;">
        <tr>
          <td style="vertical-align:middle;">
            <p style="margin:0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#7a9e86;">${escapeHtml(brand.name)}</p>
            <h1 style="margin:8px 0 0;font-size:22px;color:#e9fdf0;font-weight:normal;">${escapeHtml(title)}</h1>
          </td>
          <td style="vertical-align:middle;text-align:right;width:48px;">
            <a href="${home}" style="display:inline-block;">
              <img src="${escapeHtml(chip)}" alt="${escapeHtml(brand.name)}" width="40" height="40" style="width:40px;height:40px;border-radius:50%;border:1px solid rgba(168,255,200,0.35);display:block;" />
            </a>
          </td>
        </tr>
      </table>
      ${bodyHtml}
      <p style="margin:28px 0 0;font-size:12px;color:#7a9e86;line-height:1.5;">
        <a href="${manage}" style="color:#34d399;">Manage preferences</a>
        · You’re getting this because you subscribed at ${escapeHtml(brand.name)}.
      </p>
    </div>
  `
}

export function buildWelcomeEmail({ token, prefs, extras = {} }) {
  const lines = []
  if (prefs.quotes) lines.push('Quote cards whenever we post a new one')
  if (prefs.blog) lines.push('New blog posts')
  if (prefs.books) lines.push('New book recommendations')
  if (!lines.length) lines.push('Nothing yet — turn topics back on anytime')

  const list = lines.map((l) => `<li style="margin:0 0 6px;">${escapeHtml(l)}</li>`).join('')
  const bodyHtml = `
    <p style="margin:0 0 16px;line-height:1.6;">You’re on the list. Here’s what you’ll get:</p>
    <ul style="margin:0 0 20px;padding-left:18px;line-height:1.5;">${list}</ul>
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
    ? `<a href="${pageUrl}" style="display:block;margin:0 0 20px;"><img src="${escapeHtml(imageUrl)}" alt="Quote card #${quote.n}" width="520" style="width:100%;max-width:520px;height:auto;border:1px solid rgba(168,255,200,0.25);" /></a>`
    : ''
  const bodyHtml = `
    ${img}
    <p style="margin:0 0 12px;font-size:18px;line-height:1.55;color:#e9fdf0;">“${escapeHtml(quote.text)}”${escapeHtml(author)}</p>
    <p style="margin:0 0 8px;">${cta(pageUrl, `Open card #${quote.n}`)}</p>
    ${discoveryHtml(extras)}
  `
  return {
    subject: `New quote #${quote.n} — ${brand.name}`,
    html: emailShell({ title: `Quote #${quote.n}`, bodyHtml, token }),
    text: `“${quote.text}”${author}\n${pageUrl}\n\nManage: ${manageUrl(token)}`,
  }
}

export function buildBlogEmail({ post, token, extras = {} }) {
  const pageUrl = getUrl(postHref(post.slug))
  const summary = post.excerpt || post.description || ''
  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:18px;line-height:1.45;color:#e9fdf0;">${escapeHtml(post.title)}</p>
    ${summary ? `<p style="margin:0 0 20px;line-height:1.55;">${escapeHtml(summary)}</p>` : ''}
    <p style="margin:0 0 8px;">${cta(pageUrl, 'Read the post')}</p>
    ${discoveryHtml(extras)}
  `
  return {
    subject: `${post.title} — ${brand.name}`,
    html: emailShell({ title: 'New on the blog', bodyHtml, token }),
    text: `${post.title}\n${summary}\n${pageUrl}\n\nManage: ${manageUrl(token)}`,
  }
}

export function buildBookEmail({ book, token, extras = {} }) {
  const catalogUrl = getUrl(booksHref())
  const buyUrl = bookUrl(book) || catalogUrl
  const bodyHtml = `
    <p style="margin:0 0 8px;font-size:18px;line-height:1.45;color:#e9fdf0;">${escapeHtml(book.title)}</p>
    <p style="margin:0 0 12px;color:#7a9e86;">${escapeHtml(book.author || '')}</p>
    ${book.blurb ? `<p style="margin:0 0 20px;line-height:1.55;">${escapeHtml(book.blurb)}</p>` : ''}
    <p style="margin:0 0 8px;">${cta(buyUrl, 'View book')}</p>
    ${discoveryHtml(extras)}
  `
  return {
    subject: `Book pick: ${book.title} — ${brand.name}`,
    html: emailShell({ title: 'New book pick', bodyHtml, token }),
    text: `${book.title}${book.author ? ` — ${book.author}` : ''}\n${book.blurb || ''}\n${buyUrl}\n\nManage: ${manageUrl(token)}`,
  }
}
