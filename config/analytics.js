/**
 * First-party analytics — event vocabulary, channel taxonomy, and dashboard ranges.
 * Pure data: safe to import from the browser, API routes, and tests alike.
 */

export const analyticsEvents = {
  pageview: 'pageview',
  download: 'quote_download',
  share: 'quote_share',
}

export const analyticsEventNames = Object.values(analyticsEvents)

/** Dashboard channel rows, in the order they should read. */
export const channels = [
  { id: 'search', label: 'Organic search' },
  { id: 'social', label: 'Social' },
  { id: 'ai', label: 'AI assistants' },
  { id: 'email', label: 'Email' },
  { id: 'paid', label: 'Paid' },
  { id: 'referral', label: 'Referral' },
  { id: 'direct', label: 'Direct' },
]

export const channelLabels = Object.fromEntries(channels.map((c) => [c.id, c.label]))

/**
 * Referrer host → channel. Matched as a substring of the hostname, so `google`
 * catches every country domain. AI hosts are listed first because
 * `gemini.google.com` would otherwise be filed as search.
 */
export const referrerRules = [
  { channel: 'ai', source: 'ChatGPT', hosts: ['chatgpt.com', 'chat.openai.com', 'openai.com'] },
  { channel: 'ai', source: 'Perplexity', hosts: ['perplexity.ai'] },
  { channel: 'ai', source: 'Claude', hosts: ['claude.ai'] },
  { channel: 'ai', source: 'Gemini', hosts: ['gemini.google.com', 'bard.google.com'] },
  { channel: 'ai', source: 'Copilot', hosts: ['copilot.microsoft.com'] },

  { channel: 'social', source: 'Pinterest', hosts: ['pinterest.', 'pin.it'] },
  { channel: 'social', source: 'X', hosts: ['twitter.com', 'x.com', 't.co'] },
  { channel: 'social', source: 'Facebook', hosts: ['facebook.com', 'fb.com', 'fb.me', 'm.facebook'] },
  { channel: 'social', source: 'Instagram', hosts: ['instagram.com', 'l.instagram'] },
  { channel: 'social', source: 'LinkedIn', hosts: ['linkedin.com', 'lnkd.in'] },
  { channel: 'social', source: 'Reddit', hosts: ['reddit.com', 'redd.it'] },
  { channel: 'social', source: 'TikTok', hosts: ['tiktok.com'] },
  { channel: 'social', source: 'YouTube', hosts: ['youtube.com', 'youtu.be'] },
  { channel: 'social', source: 'WhatsApp', hosts: ['whatsapp.com', 'wa.me'] },
  { channel: 'social', source: 'Telegram', hosts: ['telegram.', 't.me'] },
  { channel: 'social', source: 'Threads', hosts: ['threads.net', 'threads.com'] },
  { channel: 'social', source: 'Bluesky', hosts: ['bsky.app', 'bsky.social'] },
  { channel: 'social', source: 'Tumblr', hosts: ['tumblr.com'] },
  { channel: 'social', source: 'Quora', hosts: ['quora.com'] },

  { channel: 'search', source: 'Google', hosts: ['google.'] },
  { channel: 'search', source: 'Bing', hosts: ['bing.com'] },
  { channel: 'search', source: 'DuckDuckGo', hosts: ['duckduckgo.com'] },
  { channel: 'search', source: 'Yahoo', hosts: ['yahoo.'] },
  { channel: 'search', source: 'Yandex', hosts: ['yandex.'] },
  { channel: 'search', source: 'Ecosia', hosts: ['ecosia.org'] },
  { channel: 'search', source: 'Brave', hosts: ['search.brave.com'] },
  { channel: 'search', source: 'Baidu', hosts: ['baidu.com'] },

  { channel: 'email', source: 'Gmail', hosts: ['mail.google.com'] },
  { channel: 'email', source: 'Outlook', hosts: ['outlook.', 'mail.yahoo'] },
]

/** `utm_medium` → channel. Anything unmatched falls back to the referrer rules. */
export const mediumRules = [
  { channel: 'paid', match: ['cpc', 'ppc', 'paid', 'paidsocial', 'paid_social', 'display', 'banner', 'ads'] },
  { channel: 'email', match: ['email', 'e-mail', 'newsletter'] },
  { channel: 'social', match: ['social', 'social-network', 'sm'] },
  { channel: 'search', match: ['organic', 'search'] },
  { channel: 'referral', match: ['referral', 'link'] },
]

/** Share buttons, keyed by the `target` sent with a `quote_share` event. */
export const shareTargetLabels = {
  native: 'Share sheet',
  copy: 'Copy link',
  x: 'X',
  linkedin: 'LinkedIn',
  pinterest: 'Pinterest',
  whatsapp: 'WhatsApp',
  threads: 'Threads',
  bluesky: 'Bluesky',
}

export const analyticsRanges = [
  { id: '7d', label: '7 days', days: 7 },
  { id: '30d', label: '30 days', days: 30 },
  { id: '90d', label: '90 days', days: 90 },
]

export const defaultRange = '30d'

export function resolveRange(id) {
  return analyticsRanges.find((r) => r.id === id) || analyticsRanges.find((r) => r.id === defaultRange)
}

/** Rows shown in each dashboard breakdown before the list is cut off. */
export const topListSize = 8

/**
 * Events older than this are dropped by a Mongo TTL index. Long enough to
 * compare this year to last, short enough that the collection stays small.
 */
export const retentionDays = 400

/** Cap for the JSON fallback used when Mongo is not configured (local dev). */
export const localEventCap = 5000

/**
 * Hard ceiling on documents pulled into a single dashboard render. Summaries are
 * computed in JS rather than in an aggregation pipeline, which keeps one code
 * path for both Mongo and the local fallback; this is the price of that.
 */
export const summaryEventCap = 50_000
