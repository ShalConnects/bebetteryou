import { createHash } from 'node:crypto'
import { dayKey } from './analytics'

/** Substring match against the user agent — cheap, and catches the loud ones. */
const botSignatures = [
  'bot',
  'crawl',
  'spider',
  'slurp',
  'headless',
  'monitor',
  'scrape',
  'curl',
  'wget',
  'node-fetch',
  'go-http-client',
  'python-requests',
  'axios',
  'okhttp',
  'lighthouse',
  'pingdom',
  'uptime',
  'facebookexternalhit',
  'telegrambot',
  'embedly',
  'vercel-screenshot',
]

export function isBot(userAgent) {
  const ua = String(userAgent || '').toLowerCase()
  if (!ua) return true
  return botSignatures.some((sig) => ua.includes(sig))
}

export function deviceFrom(userAgent) {
  const ua = String(userAgent || '').toLowerCase()
  if (/ipad|tablet|playbook|silk/.test(ua)) return 'tablet'
  if (/mobi|android|iphone|ipod/.test(ua)) return 'mobile'
  return 'desktop'
}

export function clientIp(headers) {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return headers.get('x-real-ip') || headers.get('cf-connecting-ip') || ''
}

/** Vercel and Cloudflare both hand us a country; anywhere else this is blank. */
export function countryFrom(headers) {
  return (headers.get('x-vercel-ip-country') || headers.get('cf-ipcountry') || '')
    .slice(0, 2)
    .toUpperCase()
}

function salt() {
  return process.env.ANALYTICS_SALT || process.env.NEXTAUTH_SECRET || 'bebetteryou-analytics'
}

/**
 * A stable id for one visitor for one day, and deliberately no longer. Folding
 * the date into the hash means yesterday's rows cannot be linked to today's, so
 * "visitors" reads as daily uniques and no raw IP is ever stored.
 */
export function visitorId({ ip, userAgent, now = Date.now() }) {
  return createHash('sha256')
    .update(`${salt()}:${dayKey(now)}:${ip || 'unknown'}:${userAgent || ''}`)
    .digest('hex')
    .slice(0, 32)
}

/** Everything the ingest route needs to know about the caller, in one pass. */
export function describeRequest(headers, now = Date.now()) {
  const userAgent = headers.get('user-agent') || ''
  return {
    userAgent,
    bot: isBot(userAgent),
    device: deviceFrom(userAgent),
    country: countryFrom(headers),
    visitor: visitorId({ ip: clientIp(headers), userAgent, now }),
  }
}
