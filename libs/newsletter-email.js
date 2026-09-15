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
  const base = { ...DEFAULT_NEWSLETTER_PREFS }
  if (!input || typeof input !== 'object') return base
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

function emailShell({ title, bodyHtml, token }) {
  const manage = token ? manageUrl(token) : getUrl('/')
  return `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#0a140e;color:#c6e8d2;padding:32px 24px;">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#7a9e86;">${escapeHtml(brand.name)}</p>
      <h1 style="margin:0 0 20px;font-size:22px;color:#e9fdf0;font-weight:normal;">${escapeHtml(title)}</h1>
      ${bodyHtml}
      <p style="margin:28px 0 0;font-size:12px;color:#7a9e86;line-height:1.5;">
        <a href="${manage}" style="color:#34d399;">Manage preferences</a>
        · You’re getting this because you subscribed at ${escapeHtml(appConfig.name)}.
      </p>
    </div>
  `
}

export function buildWelcomeEmail({ token, prefs }) {
  const lines = []
  if (prefs.quotes) lines.push('Quote cards whenever we post a new one')
  if (prefs.blog) lines.push('New blog posts')
  if (prefs.books) lines.push('New book recommendations')
  if (!lines.length) lines.push('Nothing yet — turn topics back on anytime')

  const list = lines.map((l) => `<li style="margin:0 0 6px;">${escapeHtml(l)}</li>`).join('')
  const bodyHtml = `
    <p style="margin:0 0 16px;line-height:1.6;">You’re on the list. Here’s what you’ll get:</p>
    <ul style="margin:0 0 20px;padding-left:18px;line-height:1.5;">${list}</ul>
    <p style="margin:0;">
      <a href="${getUrl('/')}" style="background:#34d399;color:#0a140e;padding:12px 20px;text-decoration:none;display:inline-block;">Browse quotes</a>
    </p>
  `
  return {
    subject: `You’re in — ${appConfig.name}`,
    html: emailShell({ title: 'Welcome', bodyHtml, token }),
    text: `You’re on the ${appConfig.name} list. Manage preferences: ${manageUrl(token)}`,
  }
}

/** Quote card email: image when URL is public, plus text + link. */
export function buildQuoteEmail({ quote, token }) {
  const pageUrl = getUrl(`/quotes/${quote.slug}`)
  const imageUrl = quote.src ? getUrl(quote.src) : ''
  const author = quote.author ? ` — ${quote.author}` : ''
  const img = imageUrl
    ? `<a href="${pageUrl}" style="display:block;margin:0 0 20px;"><img src="${escapeHtml(imageUrl)}" alt="Quote card #${quote.n}" width="520" style="width:100%;max-width:520px;height:auto;border:1px solid rgba(168,255,200,0.25);" /></a>`
    : ''
  const bodyHtml = `
    ${img}
    <p style="margin:0 0 12px;font-size:18px;line-height:1.55;color:#e9fdf0;">“${escapeHtml(quote.text)}”${escapeHtml(author)}</p>
    <p style="margin:0;">
      <a href="${pageUrl}" style="background:#34d399;color:#0a140e;padding:12px 20px;text-decoration:none;display:inline-block;">Open card #${quote.n}</a>
    </p>
  `
  return {
    subject: `New quote #${quote.n} — ${appConfig.name}`,
    html: emailShell({ title: `Quote #${quote.n}`, bodyHtml, token }),
    text: `“${quote.text}”${author}\n${pageUrl}\n\nManage: ${manageUrl(token)}`,
  }
}

export function buildBlogEmail({ post, token }) {
  const pageUrl = getUrl(postHref(post.slug))
  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:18px;line-height:1.45;color:#e9fdf0;">${escapeHtml(post.title)}</p>
    <p style="margin:0 0 20px;line-height:1.55;">${escapeHtml(post.excerpt || post.description || '')}</p>
    <p style="margin:0;">
      <a href="${pageUrl}" style="background:#34d399;color:#0a140e;padding:12px 20px;text-decoration:none;display:inline-block;">Read the post</a>
    </p>
  `
  return {
    subject: `${post.title} — ${appConfig.name}`,
    html: emailShell({ title: 'New on the blog', bodyHtml, token }),
    text: `${post.title}\n${post.excerpt || ''}\n${pageUrl}\n\nManage: ${manageUrl(token)}`,
  }
}

export function buildBookEmail({ book, token }) {
  const catalogUrl = getUrl(booksHref())
  const buyUrl = bookUrl(book) || catalogUrl
  const bodyHtml = `
    <p style="margin:0 0 8px;font-size:18px;line-height:1.45;color:#e9fdf0;">${escapeHtml(book.title)}</p>
    <p style="margin:0 0 12px;color:#7a9e86;">${escapeHtml(book.author || '')}</p>
    <p style="margin:0 0 20px;line-height:1.55;">${escapeHtml(book.blurb || '')}</p>
    <p style="margin:0;">
      <a href="${escapeHtml(buyUrl)}" style="background:#34d399;color:#0a140e;padding:12px 20px;text-decoration:none;display:inline-block;">View book</a>
    </p>
  `
  return {
    subject: `Book pick: ${book.title} — ${appConfig.name}`,
    html: emailShell({ title: 'New book pick', bodyHtml, token }),
    text: `${book.title}${book.author ? ` — ${book.author}` : ''}\n${book.blurb || ''}\n${buyUrl}\n\nManage: ${manageUrl(token)}`,
  }
}
